#!/bin/bash

# Generate diagrams first
echo "Generating diagrams..."
bash build_diagrams.sh

echo "Localizing slides..."
python3 localize_document.py slides.md

# Create Marp configuration if it doesn't exist
if [ ! -f .marp.json ]; then
    echo '{
        "html": true,
        "allowLocalFiles": true,
        "output": "slides.html",
        "self-contained": true
    }' > .marp.json
fi

# Build slides to self-contained HTML with embedded resources
echo "Building HTML slides..."
marp slides.md --html --allow-local-files --self-contained -o slides.html

# Build slides to PDF
echo "Building PDF slides..."
marp slides.md --pdf --allow-local-files -o slides.pdf

echo "Slides built successfully!"
echo "You can find:"
echo "- Self-contained HTML slides at slides.html (with all resources embedded)"
echo "- PDF slides at slides.pdf"
