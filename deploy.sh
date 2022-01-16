#!/bin/bash
echo "---PUSH TO GIT---"
git add .
echo "ADDING TO GIT.. FETCHING STATUS..."
git status
echo ">>>>>COMMITTING"
git commit -m "Updates"
echo "PUSHING"
git push origin main
echo "PUSHED (^_^)"