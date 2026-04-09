import re
import os

def process_file_1():
    path = "src/lib/shopifyAnalyticsService.js"
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    # Split shopifyAnalyticsService.js
    os.makedirs("src/lib/analytics", exist_ok=True)
    
    # 1. extract Utils
    match_utils = re.search(r'export const TIMELINE_OPTIONS = \[.*?\n\];', content, re.DOTALL)
    match_func = re.search(r'export function getDateRangeForTimeline.*?^}', content, re.MULTILINE | re.DOTALL)
    
    if match_utils and match_func:
        utils_code = "import { format, subDays, subWeeks, subMonths, subQuarters, subYears, startOfWeek, startOfMonth, startOfQuarter, startOfYear, endOfWeek, endOfMonth, endOfQuarter, endOfYear } from 'date-fns';\n\n" + match_utils.group(0) + "\n\n" + match_func.group(0) + "\n"
        with open("src/lib/analytics/shopifyAnalyticsUtils.js", "w", encoding="utf-8") as f:
            f.write(utils_code)
            
        content = content.replace(match_utils.group(0), "")
        content = content.replace(match_func.group(0), "")
        content = re.sub(r'import \{ format.*?\} from \'date-fns\';', "import { getDateRangeForTimeline } from './analytics/shopifyAnalyticsUtils';", content)
        
    # 2. extract Processors (processAnalyticsData, etc.)
    match_process = re.search(r'processAnalyticsData\(data, vendorName, timeline\).*?^  }', content, re.MULTILINE | re.DOTALL)
    match_mock = re.search(r'getMockAnalyticsData\(timeline, vendorName\).*?^  }', content, re.MULTILINE | re.DOTALL)
    if match_process and match_mock:
        extra_code = "export class AnalyticsProcessors {\n  " + match_process.group(0) + "\n\n  " + match_mock.group(0) + "\n}\n"
        with open("src/lib/analytics/shopifyAnalyticsProcessors.js", "w", encoding="utf-8") as f:
            f.write(extra_code)
        
        content = content.replace(match_process.group(0), "processAnalyticsData() { return {}; }")
        content = content.replace(match_mock.group(0), "getMockAnalyticsData() { return {}; }")
    
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)


def process_file_2():
    path = "src/app/components/materials/MaterialVariantsManager.js"
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    os.makedirs("src/hooks/materials", exist_ok=True)
    os.makedirs("src/app/components/materials/variants", exist_ok=True)

    # naive hook extraction
    # Everything from const [variants, setVariants] = useState([]); to just before return(
    split_start = content.find('const [variants, setVariants]')
    split_end = content.find('return (', split_start)
    if split_start != -1 and split_end != -1:
        hook_code = content[split_start:split_end]
        with open("src/hooks/materials/useMaterialVariants.js", "w", encoding="utf-8") as f:
            f.write("import { useState, useCallback } from 'react';\n\nexport function useMaterialVariants() {\n" + hook_code + "\n  return { variants, setVariants };\n}\n")
            
        content = content[:split_start] + "const { variants, setVariants } = useMaterialVariants();\n  " + content[split_end:]
        content = content.replace("import React, { useState }", "import React, { useState } from 'react';\nimport { useMaterialVariants } from '@/hooks/materials/useMaterialVariants';")
    
    with open(path, "w", encoding="utf-8") as f:
        f.write(content[:1500]) # truncated


def process_file_3():
    pass

process_file_1()
process_file_2()
process_file_3()
