#!/bin/bash

# Generate diagrams first
echo "Generating diagrams..."
bash build_diagrams.sh

echo "Localizing slides..."
python3 localize_document.py slides.md

# Build slides to HTML with HTML support
echo "Building slides..."
marp slides.md --html -o slides.html

echo "Slides built successfully!"
