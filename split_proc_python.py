import re
import os

with open('useProcessesManager.txt', 'r', encoding='utf-8') as f:
    code = f.read()

# Headers
headers = code.split('export function useProcessesManager')[0]

# Body
body = code.split('export function useProcessesManager() {')[1]

# In the body, let's find the sections safely:
# Data block: from standard vars to openDialog
data_match = re.search(r'(// Get admin settings.*?)(?=// UI state)', body, re.DOTALL)
data_code = data_match.group(1) if data_match else ""

ui_match = re.search(r'(// UI state.*?)(?=// Data Loading)', body, re.DOTALL)
ui_code = ui_match.group(1) if ui_match else ""

load_match = re.search(r'(// Data Loading.*?)return', body, re.DOTALL | re.IGNORECASE)
load_code = load_match.group(1) if load_match else ""

# Actually, I can just copy the whole body into both files, but inside Data, remove Filters. 
# In python: lines = body.split('\n')
lines = body.split('\n')

# This is too hard to parse blindly. 
# A clever trick: split by functions inside it using basic indentation matching
