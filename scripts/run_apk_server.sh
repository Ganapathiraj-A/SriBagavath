#!/bin/bash
cd "$(dirname "$0")"
export PYTHONPATH=".:$PYTHONPATH"
nohup /home/ganapathiraj/Code/AndroidDevelopment/AgentCompanion/venv/bin/python3 serve_apks.py > serve_apks.log 2>&1 &
echo "APK Server started with PID $!"
