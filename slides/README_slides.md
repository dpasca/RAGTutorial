# RAG Tutorial Slides

## Prerequisites

Install the required tools:

```bash
# Install Marp CLI for slide generation
npm install -g @marp-team/marp-cli

# Install Mermaid CLI for diagram generation
npm install -g @mermaid-js/mermaid-cli
```

## Directory Structure

- `slides.md` - Main presentation content in Markdown format
- `src/` - Source files for diagrams in Mermaid format (.mmd)
- `images/` - Generated diagram images (automatically created during build)
- `mermaid-config.json` - Styling configuration for diagrams

## How to Build the Slides

Simply run the build script:

```bash
./build_slides.sh
```

This will:
1. Generate diagram images from all `.mmd` files in the `src/` directory
2. Convert the Markdown presentation to HTML

## Adding New Diagrams

1. Create a new Mermaid diagram file in the `src/` directory with `.mmd` extension
   (e.g., `src/my_new_diagram.mmd`)
2. Add Mermaid diagram code to the file
3. Reference the diagram in your slides using:
   ```markdown
   <div style="display: flex; justify-content: center; align-items: center;">
     <img src="images/my_new_diagram.png" alt="Description" style="max-width: 90%; height: auto;">
   </div>
   ```
4. Run `./build_slides.sh` to generate the diagram and update the slides

## Diagram Styling

The diagrams use a custom theme defined in `mermaid-config.json` with pastel fill colors and strong borders for optimal readability. You can apply different styles to nodes using these CSS classes:

- Default (no class) - Light blue nodes (#D0E0FF)
- `:::secondary` - Light green nodes (#D0F0D0)
- `:::tertiary` - Light yellow nodes (#FFF0D0)
- `:::quaternary` - Light red/pink nodes (#FFD0D0)
- `:::decision` - Special styling for decision diamonds (light yellow)

Example in a diagram file:
```
flowchart LR
    A[Start] --> B[Process]:::secondary
    B --> C[Decision]:::decision
    C -->|Yes| D[Action]:::tertiary
    C -->|No| E[Skip]:::quaternary
```

## Customizing Diagram Appearance

Modify `mermaid-config.json` to change colors, fonts, and other styling properties for all diagrams. The current theme uses:

- Pastel fill colors for better contrast and readability
- Strong, darker border colors for clear node boundaries
- Rounded corners (10px radius)
- Arial font for consistent text rendering

## Viewing the Slides

Open `slides.html` in your browser after building.

