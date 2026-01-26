import re

def parse_transaction_id(text):
    # This logic matches SriBagavath Android OCRPlugin.java (v2.8.164)
    
    keywords = [
        "UTR",
        "UTR No\\.?",
        "UPI Ref\\.? No\\.?",
        "Ref No\\.?",
        "Google transaction ID",
        "UPI transaction ID",
        "Transaction ID"
    ]
    
    # 1. First Pass: Look for exactly 12 digits (Strong UTR candidate) near keywords
    # Matches radius of 100 characters using DOTALL (?s)
    for kw in keywords:
        pattern = f"(?is){kw}.{{0,100}}?(\\d{{12}})"
        match = re.search(pattern, text)
        if match:
            return match.group(1)

    # 2. Second Pass: Fallback to alpha-numeric if no 12-digit number found
    # Restricted to 8+ characters to avoid capturing button text like "Pay"
    p_generic = r"(?i)(?:UTR|UTR No\.?|UPI Ref\.? No\.?|Ref No\.?|Google transaction ID|UPI transaction ID|Transaction ID)\s*[:\-]?\s*([a-zA-Z0-9]{8,})"
    match = re.search(p_generic, text, re.MULTILINE)
    if match:
        return match.group(1)

    return None

# --- TEST CASES ---

test_cases = [
    {
        "name": "Standard GPay (with noise)",
        "text": """
            UPI transaction ID
            Pay again
            533500207002
            To: SRI BAGAVATH MISSION
        """,
        "expected": "533500207002"
    },
    {
        "name": "Traditional UTR",
        "text": "UTR No: 123456789012",
        "expected": "123456789012"
    },
    {
        "name": "Google Internal ID (Fallback)",
        "text": "Google transaction ID: CICAgOipxpWCHw",
        "expected": "CICAgOipxpWCHw"
    },
    {
        "name": "Noise Rejection (Pay)",
        "text": "UPI transaction ID Pay",
        "expected": None # 'Pay' is too short (Pass 2 requires 8+)
    }
]

for case in test_cases:
    result = parse_transaction_id(case["text"])
    status = "SUCCESS" if result == case["expected"] else "FAILURE"
    print(f"[{status}] {case['name']}: {result} (Expected: {case['expected']})")

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        with open(sys.argv[1], 'r') as f:
            print(f"\nTesting File {sys.argv[1]}:")
            print(f"Result: {parse_transaction_id(f.read())}")
