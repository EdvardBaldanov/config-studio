//go:build !windows

package agent

import "syscall"

func collectDiskMetrics(m *SystemMetrics) {
	mounts := []string{"/"}
	for _, mount := range mounts {
		var stat syscall.Statfs_t
		if err := syscall.Statfs(mount, &stat); err == nil && stat.Blocks > 0 {
			total := stat.Blocks * uint64(stat.Bsize)
			free := stat.Bfree * uint64(stat.Bsize)
			avail := stat.Bavail * uint64(stat.Bsize)
			used := total - free
			usedPct := (float64(used) / float64(total)) * 100

			m.Disks = append(m.Disks, DiskInfo{
				MountPoint:     mount,
				TotalBytes:     total,
				AvailableBytes: avail,
				UsedBytes:      used,
				UsedPercent:    usedPct,
			})
		}
	}
}
