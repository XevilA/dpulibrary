#!/usr/bin/env python3
"""
Generate real high-resolution cover images from the 1st page of all 138+ DPU PDF theses
and extract the exact student author names directly from the cover text.
"""

import os
import ssl
import re
import fitz # PyMuPDF
import urllib.request
import psycopg2
from concurrent.futures import ThreadPoolExecutor, as_completed

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
}

COVERS_DIR = '/Volumes/MAC 1/elib/frontend/public/covers'
os.makedirs(COVERS_DIR, exist_ok=True)

def process_book(book_id, title, pdf_url):
    if not pdf_url or not pdf_url.startswith('http'):
        return None
        
    out_filename = f'{book_id}.png'
    out_path = os.path.join(COVERS_DIR, out_filename)
    
    try:
        req = urllib.request.Request(pdf_url, headers=HEADERS)
        with urllib.request.urlopen(req, context=ctx, timeout=20) as resp:
            pdf_bytes = resp.read()
            
        doc = fitz.open(stream=pdf_bytes, filetype='pdf')
        if len(doc) == 0:
            return None
            
        page = doc.load_page(0)
        text = page.get_text()
        
        # Render high-res 2x cover image
        pix = page.get_pixmap(matrix=fitz.Matrix(2.0, 2.0))
        pix.save(out_path)
        
        # Extract real author from the cover text (typically a 2-word Thai name in the middle)
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        author_candidate = None
        for i, line in enumerate(lines):
            # Skip header lines, logo text, title words, university name
            if any(skip in line for skip in ['DPU', 'DHURAKIJ', 'มหาวิทยาลัย', 'วิทยาลัย', 'หลักสูตร', 'ปีการศึกษา', 'การศึกษาค้นคว้า', 'วิทยานิพนธ์', 'สารนิพนธ์']):
                continue
            # Look for 2 or 3 word Thai name like "ศิวัช ศิวัฒน์กฤตานนท์", "ปริศนา ลาเหล่า"
            words = line.split()
            if len(words) in [2, 3] and all(re.match(r'^[ก-๙]+$', w) for w in words):
                author_candidate = line
                break
                
        return {
            'id': book_id,
            'cover_url': f'/covers/{out_filename}',
            'author': author_candidate,
            'pages': len(doc),
        }
    except Exception as e:
        print(f'Error processing {book_id} ({pdf_url}):', e)
        return None

def main():
    print('🚀 Starting High-Res Cover Generation from PDF 1st Page...')
    
    conn = psycopg2.connect(dbname='elib_db', user='dotmini', host='localhost', port=5432)
    cur = conn.cursor()
    
    cur.execute("SELECT id, title, pdf_url FROM books WHERE pdf_url != '';")
    books = cur.fetchall()
    print(f'Found {len(books)} books with PDF links in database.')
    
    success_count = 0
    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = {executor.submit(process_book, b[0], b[1], b[2]): b[0] for b in books}
        for f in as_completed(futures):
            res = f.result()
            if res:
                sql = "UPDATE books SET cover_url = %s"
                params = [res['cover_url']]
                if res['author']:
                    sql += ", author = %s"
                    params.append(res['author'])
                if res['pages']:
                    sql += ", pages = %s"
                    params.append(res['pages'])
                sql += " WHERE id = %s"
                params.append(res['id'])
                
                cur.execute(sql, tuple(params))
                success_count += 1
                if success_count % 15 == 0:
                    print(f'   -> Rendered and saved {success_count}/{len(books)} covers...')
                    conn.commit()
                    
    conn.commit()
    cur.close()
    conn.close()
    
    print(f'🎉 Completed! Rendered {success_count} real thesis covers into {COVERS_DIR}!')

if __name__ == '__main__':
    main()
