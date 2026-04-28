@echo off
setlocal

call "%~dp0stop_aiml_fastapi.bat" --quiet
call "%~dp0run_aiml_fastapi.bat"
