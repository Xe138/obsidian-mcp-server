#!/bin/bash

echo "🔍 Obsidian MCP Server Plugin Verification"
echo "=========================================="
echo ""

# Check if we're in the right directory
if [ ! -f "manifest.json" ]; then
    echo "❌ Error: manifest.json not found"
    echo "   Run this script from the plugin directory"
    exit 1
fi

echo "✅ Plugin directory found"
echo ""

# Check required files
echo "📁 Checking required files..."
files=("main.js" "manifest.json" "styles.css")
for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        size=$(ls -lh "$file" | awk '{print $5}')
        echo "   ✅ $file ($size)"
    else
        echo "   ❌ $file (missing)"
    fi
done
echo ""

# Check manifest.json content
echo "📋 Checking manifest.json..."
if command -v jq &> /dev/null; then
    echo "   ID: $(jq -r '.id' manifest.json)"
    echo "   Name: $(jq -r '.name' manifest.json)"
    echo "   Version: $(jq -r '.version' manifest.json)"
    echo "   Desktop Only: $(jq -r '.isDesktopOnly' manifest.json)"
else
    echo "   (install jq for detailed manifest info)"
    cat manifest.json
fi
echo ""

# Check if main.js is valid
echo "🔧 Checking main.js..."
if [ -f "main.js" ]; then
    # Check if it's minified/bundled
    if head -1 main.js | grep -q "GENERATED/BUNDLED"; then
        echo "   ✅ File appears to be bundled correctly"
    else
        echo "   ⚠️  File may not be bundled correctly"
    fi
    
    # Check for export
    if grep -q "export" main.js; then
        echo "   ✅ Contains exports"
    else
        echo "   ⚠️  No exports found (may be an issue)"
    fi
else
    echo "   ❌ main.js not found"
fi
echo ""

# Check node_modules
echo "📦 Checking dependencies..."
if [ -d "node_modules" ]; then
    echo "   ✅ node_modules exists"
    if [ -d "node_modules/express" ]; then
        echo "   ✅ express installed"
    else
        echo "   ❌ express not installed"
    fi
    if [ -d "node_modules/cors" ]; then
        echo "   ✅ cors installed"
    else
        echo "   ❌ cors not installed"
    fi
else
    echo "   ❌ node_modules not found - run 'npm install'"
fi
echo ""

# Summary
echo "📊 Summary"
echo "=========="
if [ -f "main.js" ] && [ -f "manifest.json" ] && [ -f "styles.css" ]; then
    echo "✅ All required files present"
    echo ""
    echo "Next steps:"
    echo "1. Restart Obsidian"
    echo "2. Go to Settings → Community Plugins"
    echo "3. Enable 'MCP Server'"
    echo "4. Check for errors in Console (Ctrl+Shift+I)"
else
    echo "❌ Some required files are missing"
    echo ""
    echo "To fix:"
    echo "1. Run: npm install"
    echo "2. Run: npm run build"
    echo "3. Restart Obsidian"
fi
