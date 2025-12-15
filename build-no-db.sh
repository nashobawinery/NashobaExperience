#!/bin/bash
# Build script without database push for deployments
# Use this instead of 'npm run build' when deploying

echo "Building frontend with Vite..."
npx vite build

echo "Building backend with esbuild..."
npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist

echo "Build complete!"
