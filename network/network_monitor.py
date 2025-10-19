#!/usr/bin/env python3
import subprocess
import json
import re
from datetime import datetime
import speedtest  # pip install speedtest-cli


def measure_internet_speed():
    """Measure actual internet speed using speedtest.net"""
    try:
        print("🌐 Measuring internet speed...")
        st = speedtest.Speedtest()

        # Get best server
        st.get_best_server()

        # Measure download speed
        print("📥 Testing download speed...")
        download_speed = st.download() / 1_000_000  # Convert to Mbps

        # Measure upload speed
        print("📤 Testing upload speed...")
        upload_speed = st.upload() / 1_000_000  # Convert to Mbps

        # Get ping
        ping = st.results.ping

        return {
            "download_mbps": round(download_speed, 2),
            "upload_mbps": round(upload_speed, 2),
            "ping_ms": round(ping, 2),
            "server": st.results.server["name"],
            "method": "speedtest",
            "timestamp": datetime.now().isoformat(),
        }
    except Exception as e:
        print(f"❌ Speedtest failed: {e}")
        return {
            "download_mbps": 0,
            "upload_mbps": 0,
            "ping_ms": 0,
            "method": "failed",
            "error": str(e),
        }


def get_wifi_metrics():
    """Get comprehensive network metrics"""
    metrics = {
        "timestamp": datetime.now().isoformat(),
        "wifi_connection": {
            "link_speed_mbps": 0,
            "signal_strength": {"dBm": 0, "percentage": 0, "bars": 0},
            "local_quality": "Unknown",
        },
        "network_info": {
            "ip_address": "Unknown",
            "ssid": "Unknown",
            "interface": "wlan0",
        },
        "internet_speed": {},  # Will be populated by speed test
    }

    try:
        # Get WiFi interface info
        result = subprocess.run(["iwconfig"], capture_output=True, text=True)

        # Parse signal strength and link speed
        for line in result.stdout.split("\n"):
            if "Signal level" in line:
                match = re.search(r"Signal level=(-?\d+) dBm", line)
                if match:
                    dBm = int(match.group(1))
                    percentage = max(0, min(100, 2 * (dBm + 100)))
                    metrics["wifi_connection"]["signal_strength"] = {
                        "dBm": dBm,
                        "percentage": percentage,
                        "bars": get_bars_from_dbm(dBm),
                    }
                    metrics["wifi_connection"]["local_quality"] = get_quality_from_dbm(
                        dBm
                    )

            if "Bit Rate" in line:
                match = re.search(r"Bit Rate=([\d.]+) Mb/s", line)
                if match:
                    metrics["wifi_connection"]["link_speed_mbps"] = float(
                        match.group(1)
                    )

        # Get IP and SSID
        result = subprocess.run(["hostname", "-I"], capture_output=True, text=True)
        if result.stdout.strip():
            metrics["network_info"]["ip_address"] = result.stdout.strip().split()[0]

        result = subprocess.run(["iwgetid", "-r"], capture_output=True, text=True)
        if result.stdout.strip():
            metrics["network_info"]["ssid"] = result.stdout.strip()

    except Exception as e:
        print(f"Error getting WiFi metrics: {e}")

    return metrics


def get_bars_from_dbm(dBm):
    """Convert dBm to bars"""
    if dBm >= -50:
        return 4
    elif dBm >= -60:
        return 3
    elif dBm >= -70:
        return 2
    elif dBm >= -80:
        return 1
    else:
        return 0


def get_quality_from_dbm(dBm):
    """Get quality description from dBm"""
    if dBm >= -50:
        return "Excellent"
    elif dBm >= -60:
        return "Good"
    elif dBm >= -70:
        return "Fair"
    elif dBm >= -80:
        return "Poor"
    else:
        return "Very Poor"


# Enhanced network monitor with caching
class NetworkMonitor:
    def __init__(self):
        self.last_speed_test = None
        self.speed_test_interval = 300  # 5 minutes

    def get_complete_metrics(self):
        """Get all metrics with cached speed test"""
        metrics = get_wifi_metrics()

        # Only run speed test if:
        # - Never run before, OR
        # - Last test was more than interval ago
        should_test = (
            self.last_speed_test is None
            or (datetime.now() - self.last_speed_test).total_seconds()
            > self.speed_test_interval
        )

        if should_test:
            print("🔄 Running internet speed test...")
            metrics["internet_speed"] = measure_internet_speed()
            self.last_speed_test = datetime.now()
        else:
            # Use cached result with note
            if hasattr(self, "cached_speed"):
                metrics["internet_speed"] = self.cached_speed.copy()
                metrics["internet_speed"]["cached"] = True
                metrics["internet_speed"]["cache_age_minutes"] = round(
                    (datetime.now() - self.last_speed_test).total_seconds() / 60, 1
                )
            else:
                metrics["internet_speed"] = {"method": "pending"}

        # Cache the result
        if "internet_speed" in metrics and "cached" not in metrics["internet_speed"]:
            self.cached_speed = metrics["internet_speed"].copy()

        return metrics


# Test the enhanced monitor
if __name__ == "__main__":
    monitor = NetworkMonitor()
    metrics = monitor.get_complete_metrics()
    print(json.dumps(metrics, indent=4))