package agent

import (
	"bufio"
	"fmt"
	"os"
	"runtime"
	"strconv"
	"strings"
	"time"
)

type SystemMetrics struct {
	Hostname     string       `json:"hostname"`
	OS           string       `json:"os"`
	Arch         string       `json:"arch"`
	NumCPU       int          `json:"numCpu"`
	UptimeSec    int64        `json:"uptimeSec"`
	LoadAvg      [3]float64   `json:"loadAvg"`
	Memory       MemoryInfo   `json:"memory"`
	Disks        []DiskInfo   `json:"disks"`
	CollectedAt  time.Time    `json:"collectedAt"`
	AgentVersion string       `json:"agentVersion"`
}

type MemoryInfo struct {
	TotalBytes     uint64  `json:"totalBytes"`
	AvailableBytes uint64  `json:"availableBytes"`
	UsedBytes      uint64  `json:"usedBytes"`
	UsedPercent    float64 `json:"usedPercent"`
}

type DiskInfo struct {
	MountPoint     string  `json:"mountPoint"`
	TotalBytes     uint64  `json:"totalBytes"`
	AvailableBytes uint64  `json:"availableBytes"`
	UsedBytes      uint64  `json:"usedBytes"`
	UsedPercent    float64 `json:"usedPercent"`
}

var agentStartTime = time.Now()

// CollectSystemMetrics gathers OS & hardware telemetry.
func CollectSystemMetrics(version string) SystemMetrics {
	hostname, _ := os.Hostname()

	m := SystemMetrics{
		Hostname:     hostname,
		OS:           runtime.GOOS,
		Arch:         runtime.GOARCH,
		NumCPU:       runtime.NumCPU(),
		UptimeSec:    int64(time.Since(agentStartTime).Seconds()),
		CollectedAt:  time.Now().UTC(),
		AgentVersion: version,
		Disks:        []DiskInfo{},
	}

	// Read Linux specific /proc if available
	if runtime.GOOS == "linux" {
		readLinuxUptime(&m)
		readLinuxLoadAvg(&m)
		readLinuxMemInfo(&m)
	} else {
		// Fallback for Windows / macOS / dev
		var rMem runtime.MemStats
		runtime.ReadMemStats(&rMem)
		m.Memory = MemoryInfo{
			TotalBytes:     rMem.Sys,
			AvailableBytes: rMem.Sys - rMem.Alloc,
			UsedBytes:      rMem.Alloc,
			UsedPercent:    float64(rMem.Alloc) / float64(rMem.Sys) * 100,
		}
	}

	collectDiskMetrics(&m)
	return m
}

func readLinuxUptime(m *SystemMetrics) {
	data, err := os.ReadFile("/proc/uptime")
	if err == nil {
		parts := strings.Fields(string(data))
		if len(parts) > 0 {
			if sec, err := strconv.ParseFloat(parts[0], 64); err == nil {
				m.UptimeSec = int64(sec)
			}
		}
	}
}

func readLinuxLoadAvg(m *SystemMetrics) {
	data, err := os.ReadFile("/proc/loadavg")
	if err == nil {
		parts := strings.Fields(string(data))
		if len(parts) >= 3 {
			l1, _ := strconv.ParseFloat(parts[0], 64)
			l5, _ := strconv.ParseFloat(parts[1], 64)
			l15, _ := strconv.ParseFloat(parts[2], 64)
			m.LoadAvg = [3]float64{l1, l5, l15}
		}
	}
}

func readLinuxMemInfo(m *SystemMetrics) {
	file, err := os.Open("/proc/meminfo")
	if err != nil {
		return
	}
	defer file.Close()

	var total, free, available, buffers, cached uint64
	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := scanner.Text()
		parts := strings.Fields(line)
		if len(parts) < 2 {
			continue
		}
		val, _ := strconv.ParseUint(parts[1], 10, 64)
		valBytes := val * 1024

		switch strings.TrimSuffix(parts[0], ":") {
		case "MemTotal":
			total = valBytes
		case "MemFree":
			free = valBytes
		case "MemAvailable":
			available = valBytes
		case "Buffers":
			buffers = valBytes
		case "Cached":
			cached = valBytes
		}
	}

	if available == 0 {
		available = free + buffers + cached
	}
	used := total - available
	var usedPct float64
	if total > 0 {
		usedPct = (float64(used) / float64(total)) * 100
	}

	m.Memory = MemoryInfo{
		TotalBytes:     total,
		AvailableBytes: available,
		UsedBytes:      used,
		UsedPercent:    usedPct,
	}
}

// ToPrometheusFormat formats metrics into Prometheus OpenMetrics exposition format.
func (m *SystemMetrics) ToPrometheusFormat() string {
	var b strings.Builder
	b.WriteString("# HELP cs_agent_uptime_seconds Agent uptime in seconds\n")
	b.WriteString("# TYPE cs_agent_uptime_seconds counter\n")
	b.WriteString(fmt.Sprintf("cs_agent_uptime_seconds{hostname=%q} %d\n\n", m.Hostname, m.UptimeSec))

	b.WriteString("# HELP cs_agent_cpu_cores Number of CPU cores\n")
	b.WriteString("# TYPE cs_agent_cpu_cores gauge\n")
	b.WriteString(fmt.Sprintf("cs_agent_cpu_cores{hostname=%q} %d\n\n", m.Hostname, m.NumCPU))

	b.WriteString("# HELP cs_agent_load1 1-minute load average\n")
	b.WriteString("# TYPE cs_agent_load1 gauge\n")
	b.WriteString(fmt.Sprintf("cs_agent_load1{hostname=%q} %.2f\n\n", m.Hostname, m.LoadAvg[0]))

	b.WriteString("# HELP cs_agent_memory_total_bytes Total system memory\n")
	b.WriteString("# TYPE cs_agent_memory_total_bytes gauge\n")
	b.WriteString(fmt.Sprintf("cs_agent_memory_total_bytes{hostname=%q} %d\n\n", m.Hostname, m.Memory.TotalBytes))

	b.WriteString("# HELP cs_agent_memory_used_bytes Used system memory\n")
	b.WriteString("# TYPE cs_agent_memory_used_bytes gauge\n")
	b.WriteString(fmt.Sprintf("cs_agent_memory_used_bytes{hostname=%q} %d\n\n", m.Hostname, m.Memory.UsedBytes))

	b.WriteString("# HELP cs_agent_memory_used_percent Used system memory percentage\n")
	b.WriteString("# TYPE cs_agent_memory_used_percent gauge\n")
	b.WriteString(fmt.Sprintf("cs_agent_memory_used_percent{hostname=%q} %.2f\n\n", m.Hostname, m.Memory.UsedPercent))

	for _, d := range m.Disks {
		b.WriteString(fmt.Sprintf("cs_agent_disk_used_percent{hostname=%q,mount=%q} %.2f\n", m.Hostname, d.MountPoint, d.UsedPercent))
	}

	return b.String()
}
