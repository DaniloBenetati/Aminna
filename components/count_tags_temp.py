
import re

def find_lines(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    for i, line in enumerate(lines):
        line_num = i + 1
        clean_line = re.sub(r'//.*', '', line).strip()
        
        if "activeTab === '" in clean_line:
            print(f"L{line_num}: OPEN {clean_line}")
        elif "dreSubTab === '" in clean_line:
            print(f"L{line_num}:   SUB-OPEN {clean_line}")
        elif "accountsSubTab === '" in clean_line:
            print(f"L{line_num}:   SUB-OPEN {clean_line}")
        elif clean_line == ")}":
            print(f"L{line_num}: CLOSE )}}")
        elif clean_line == "</div>":
            print(f"L{line_num}: CLOSE </div>")
        elif clean_line == "</div>)":
            print(f"L{line_num}: CLOSE </div>)")
        elif clean_line == ")}":
             print(f"L{line_num}: CLOSE )}}")
        elif clean_line == "});":
             print(f"L{line_num}: CLOSE }});")

if __name__ == "__main__":
    find_lines(r"c:\Users\Lenovo\Downloads\gestão-inteligente---aminna\Aminna\components\Finance.tsx")
