import os
import sys
import zipfile
import tempfile
from pathlib import Path

sys.path.insert(0, os.path.join(os.getcwd(), 'api'))
from fastapi.testclient import TestClient
from app import app

with tempfile.TemporaryDirectory() as tmp:
    p = Path(tmp) / 'test.docx'
    with zipfile.ZipFile(p, 'w') as z:
        z.writestr('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>')
        z.writestr('_rels/.rels', '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>')
        z.writestr('word/document.xml', '<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Hello DOCX</w:t></w:r></w:p><w:sectPr/></w:body></w:document>')
    client = TestClient(app)
    with open(p, 'rb') as f:
        response = client.post('/resume/analyze', files={ 'file': ('test.docx', f, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') })
    print('status', response.status_code)
    print(response.text)
