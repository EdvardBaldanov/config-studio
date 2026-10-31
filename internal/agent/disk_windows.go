//go:build windows

package agent

import (
	"syscall"
	"unsafe"
)

var (
	kernel32            = syscall.NewLazyDLL("kernel32.dll")
	getDiskFreeSpaceExW = kernel32.NewProc("GetDiskFreeSpaceExW")
)

func collectDiskMetrics(m *SystemMetrics) {
	drive := "C:\\"
	drivePtr, err := syscall.UTF16PtrFromString(drive)
	if err != nil {
		return
	}

	var freeBytesAvailable, totalNumberOfBytes, totalNumberOfFreeBytes uint64

	r1, _, _ := getDiskFreeSpaceExW.Call(
		uintptr(unsafe.Pointer(drivePtr)),
		uintptr(unsafe.Pointer(&freeBytesAvailable)),
		uintptr(unsafe.Pointer(&totalNumberOfBytes)),
		uintptr(unsafe.Pointer(&totalNumberOfFreeBytes)),
	)

	if r1 != 0 && totalNumberOfBytes > 0 {
		used := totalNumberOfBytes - totalNumberOfFreeBytes
		usedPct := (float64(used) / float64(totalNumberOfBytes)) * 100
		m.Disks = append(m.Disks, DiskInfo{
			MountPoint:     drive,
			TotalBytes:     totalNumberOfBytes,
			AvailableBytes: freeBytesAvailable,
			UsedBytes:      used,
			UsedPercent:    usedPct,
		})
	}
}
