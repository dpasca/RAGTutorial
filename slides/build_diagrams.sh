#!/bin/bash

# Create images directory if it doesn't exist
mkdir -p images

# Install Mermaid CLI if not already installed
if ! command -v mmdc &> /dev/null; then
    echo "Installing @mermaid-js/mermaid-cli..."
    npm install -g @mermaid-js/mermaid-cli
fi

# Process all .mmd files in the src directory
echo "Generating diagram images..."
for mmd_file in src/*.mmd; do
    if [ -f "$mmd_file" ]; then
        # Extract the base filename without extension
        base_name=$(basename "$mmd_file" .mmd)
        output_file="images/${base_name}.png"

        echo "Processing $mmd_file → $output_file"
        mmdc -i "$mmd_file" -o "$output_file" -t default -b transparent -w 1000 -H 500 -c mermaid-config.json
    fi
done

echo "Diagrams generated successfully!"