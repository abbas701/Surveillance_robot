### Install Mosquitto MQTT protocol broker (https://mosquitto.org/download/) 

### Command prompt
#### netstat -ano | findstr :1883 (check what running on the default mosquitto port, copy the PID(Process ID))
#### tasklist | findstr 4808 (Use the PID to find if there is anything else running along with mosquitto)

### Open up mosquitto.config and add (
#### allow_anonymous true
#### listener 1883 0.0.0.0) 

## For Local Setup

### PowerShell (Run as admin)
#### Stop-Process -Id 4808 -Force (no output)
#### Get-Process -Id 4808 -ErrorAction SilentlyContinue (no output)
#### netstat -ano | findstr :1883 (no output)
#### Get-Service -Name mosquitto (will give verification that mosquitto has stopped)
#### Stop-Service -Name mosquitto
#### Set-Service -Name mosquitto -StartupType Disabled
#### .\mosquitto.exe -c mosquitto.conf -v (Run in the folder where mosquitto is installed)
#### Start-Process -FilePath ".\mosquitto.exe" -ArgumentList "-c mosquitto.conf" -NoNewWindow
#### Get-Process -Name mosquitto (Should show output)
#### netstat -ano | findstr :1883 (Should show 0.0.0.0:1883)
#### .\mosquitto_sub.exe -h localhost -t "robot/sensors" (run subscriber environment)

### Open aother PowerShell (Run as admin) for publisher environment
#### .\mosquitto_pub.exe -h localhost -t "robot/sensors" -m '{"test": 1, "temperature": 25.5, "pressure": 1013.2, "altitude": 123.45}'  (send data to the subscriber)

### Will see the data appear in the subscriber environment