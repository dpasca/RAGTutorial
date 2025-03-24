#!/bin/bash

# Generate diagrams first
echo "Generating diagrams..."
bash build_diagrams.sh

# Build slides to HTML with HTML support
echo "Building slides..."
marp slides.md --html -o slides.html

echo "Slides built successfully!"
