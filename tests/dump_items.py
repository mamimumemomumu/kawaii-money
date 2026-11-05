# Emulates pdf.js text items ({str,x,y,page}) with pdfplumber, for testing parsers.js in Node.
import sys, json, pdfplumber
items = []
with pdfplumber.open(sys.argv[1]) as pdf:
    for pi, page in enumerate(pdf.pages, 1):
        for w in page.extract_words(keep_blank_chars=False, use_text_flow=False, x_tolerance=1.5):
            items.append({"str": w["text"], "x": round(w["x0"], 2), "y": round(w["bottom"], 2), "page": pi})
json.dump(items, sys.stdout, ensure_ascii=False)
