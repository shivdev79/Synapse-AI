# Synapse AI - Start Project
Write-Host "Starting Synapse AI Backend..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; .\venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8080"

Write-Host "Starting Synapse AI Frontend..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"

Write-Host "Synapse AI is launching!" -ForegroundColor Green
Write-Host "Backend: http://127.0.0.1:8080"
Write-Host "Frontend: Check Vite output (usually http://localhost:5173)"
