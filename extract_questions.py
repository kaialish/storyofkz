import zipfile
import xml.etree.ElementTree as ET
import re
import json
import os

docx_path = r'Академический сборник ответов на 40 кейсовых вопросов по Истории Казахстана.docx'
output_json_path = os.path.join('data', 'questions.json')

with zipfile.ZipFile(docx_path) as z:
    xml_content = z.read('word/document.xml')

root = ET.fromstring(xml_content)
w_ns = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
body = root.find(f'{{{w_ns}}}body')

def get_text_from_node(node):
    return ''.join(t.text for t in node.iter(f'{{{w_ns}}}t') if t.text).strip()

elements = []
for child in body:
    tag = child.tag.replace(f'{{{w_ns}}}', '')
    if tag == 'p':
        txt = get_text_from_node(child)
        if txt:
            elements.append(('p', txt))
    elif tag == 'tbl':
        rows_data = []
        for row in child.findall(f'{{{w_ns}}}tr'):
            cells = []
            for cell in row.findall(f'{{{w_ns}}}tc'):
                cell_text = ' '.join(get_text_from_node(p) for p in cell.findall(f'{{{w_ns}}}p'))
                cells.append(cell_text.strip())
            rows_data.append(cells)
        elements.append(('tbl', rows_data))

questions = []
current_q = None

for el_type, content in elements:
    if el_type == 'p':
        m = re.match(r'^Вопрос\s*№?\s*(\d+)[\:\.]?\s*(.*)', content, re.IGNORECASE)
        if m:
            if current_q:
                questions.append(current_q)
            q_id = int(m.group(1))
            q_title = m.group(2).strip()
            current_q = {
                'id': q_id,
                'title': q_title,
                'raw_elements': []
            }
            continue
    if current_q is not None:
        current_q['raw_elements'].append((el_type, content))

if current_q:
    questions.append(current_q)

formatted_questions = []
for q in questions:
    parts = []
    for el_type, content in q['raw_elements']:
        if el_type == 'p':
            parts.append(content)
        elif el_type == 'tbl':
            if content:
                header = content[0]
                tbl_lines = []
                tbl_lines.append("| " + " | ".join(header) + " |")
                tbl_lines.append("| " + " | ".join(["---"] * len(header)) + " |")
                for row in content[1:]:
                    tbl_lines.append("| " + " | ".join(row) + " |")
                parts.append("\n".join(tbl_lines))
    
    answer_text = "\n\n".join(parts)
    formatted_questions.append({
        'id': q['id'],
        'title': q['title'],
        'answer': answer_text
    })

os.makedirs('data', exist_ok=True)
with open(output_json_path, 'w', encoding='utf-8') as f:
    json.dump(formatted_questions, f, ensure_ascii=False, indent=2)

print(f"Successfully extracted {len(formatted_questions)} questions to {output_json_path}.")
