#!/usr/bin/env python3

import sys
import os
import re
from openai import OpenAI

def main():
    # Check if a file is provided
    if len(sys.argv) < 2:
        print("Usage: python3 localize_document.py <filename>")
        sys.exit(1)

    filename = sys.argv[1]

    # Check if file exists
    if not os.path.exists(filename):
        print(f"Error: File '{filename}' not found")
        sys.exit(1)

    # Read the file content
    with open(filename, 'r') as file:
        content = file.read()

    # Define tag pattern and find all instances
    tag_pattern = r'<Insert-Japanese-translation>'
    matches = re.findall(tag_pattern, content)

    if not matches:
        print("No translation tags found. Exiting.")
        sys.exit(0)

    print(f"Found {len(matches)} translation tags. Sending document to OpenAI for processing...")

    # Initialize OpenAI client
    client = OpenAI()

    system_prompt = f"""
You are a translation assistant that specializes in Japanese.
You are given a document that contains tags like "{tag_pattern}".
For each occurrence of this tag, replace the tag with a Japanese translation of
the text that comes immediately before it.
Return the entire document with all tags replaced by appropriate Japanese translations.
Never remove existing text or formatting, you are simply to augment the doc by adding
the Japanese translations.
Respond only with the translated document, without any other text, comments or formatting.
"""
    # Request translation from OpenAI using chat completions API
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": content}
        ],
        temperature=0.3
    )

    # Get the translated content
    translated_content = response.choices[0].message.content.strip()

    # Only strip backtick code blocks if they appear at the beginning and end of the document
    if translated_content.startswith('```'):
        # Remove the opening code block marker and any text until the first newline
        translated_content = re.sub(r'^```.*?\n', '', translated_content, 1)

    if translated_content.endswith('```'):
        # Remove the closing code block marker (and the newline before it)
        translated_content = re.sub(r'\n```\s*$', '', translated_content)

    # Write the updated content back to the file
    with open(filename, 'w') as file:
        file.write(translated_content)

    print("Translation completed successfully!")

if __name__ == "__main__":
    main()