package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"config-studio/internal/cspkg"
)

const version = "1.0.0"

func printUsage() {
	fmt.Printf(`Config Studio Plugin Packager (cspkg) v%s
Official standalone CLI tool for building and inspecting Config Studio plugin packages.

USAGE:
    cspkg pack <plugin-folder> [-o <output.cspkg>]   Compile a plugin directory into a .cspkg package
    cspkg inspect <file.cspkg>                      Inspect manifest, checksum, and file list
    cspkg unpack <file.cspkg> [-o <target-dir>]      Extract contents of a .cspkg package
    cspkg validate <file.cspkg>                     Verify package SHA-256 integrity and manifest
    cspkg version                                   Show version info

EXAMPLES:
    cspkg pack ./my-plugin
    cspkg pack ./config-studio-web-devkit -o web-devkit-1.2.0.cspkg
    cspkg inspect web-devkit-1.2.0.cspkg
    cspkg unpack web-devkit-1.2.0.cspkg -o ./extracted
`, version)
}

func main() {
	if len(os.Args) < 2 {
		printUsage()
		os.Exit(1)
	}

	command := os.Args[1]

	switch command {
	case "version", "-v", "--version":
		fmt.Printf("cspkg v%s (format v%d)\n", version, cspkg.FormatVersion)

	case "pack":
		var srcDir string
		var destFile string
		args := os.Args[2:]
		for i := 0; i < len(args); i++ {
			if args[i] == "-o" && i+1 < len(args) {
				destFile = args[i+1]
				i++
			} else if strings.HasPrefix(args[i], "-o=") {
				destFile = strings.TrimPrefix(args[i], "-o=")
			} else if !strings.HasPrefix(args[i], "-") {
				if srcDir == "" {
					srcDir = args[i]
				} else if destFile == "" {
					destFile = args[i]
				}
			}
		}

		if srcDir == "" {
			fmt.Fprintln(os.Stderr, "Error: plugin folder path required")
			fmt.Fprintln(os.Stderr, "Usage: cspkg pack <plugin-folder> [-o <output.cspkg>]")
			os.Exit(1)
		}

		// Pre-read manifest to get default output name if not specified
		if destFile == "" {
			manifestPath := filepath.Join(srcDir, "plugin.json")
			data, err := os.ReadFile(manifestPath)
			if err != nil {
				fmt.Fprintf(os.Stderr, "Error: cannot read %s: %v\n", manifestPath, err)
				os.Exit(1)
			}
			var m struct {
				ID      string `json:"id"`
				Version string `json:"version"`
			}
			_ = json.Unmarshal(data, &m)
			if m.ID != "" && m.Version != "" {
				destFile = fmt.Sprintf("%s-%s.cspkg", m.ID, m.Version)
			} else {
				destFile = filepath.Base(srcDir) + ".cspkg"
			}
		}

		fmt.Printf("Packing plugin at %q -> %q ...\n", srcDir, destFile)
		info, err := cspkg.Pack(srcDir, destFile)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error packing plugin: %v\n", err)
			os.Exit(1)
		}

		fmt.Printf("✓ Successfully created package: %s\n", destFile)
		fmt.Printf("  ID:          %s\n", info.ID)
		fmt.Printf("  Name:        %s\n", info.Name)
		fmt.Printf("  Version:     v%s\n", info.Version)
		fmt.Printf("  Files:       %d files (%d bytes uncompressed)\n", len(info.Files), info.TotalSize)
		fmt.Printf("  Packed Size: %d bytes\n", info.PackedSize)
		fmt.Printf("  SHA-256:     %s\n", info.Checksum)

	case "inspect":
		if len(os.Args) < 3 {
			fmt.Fprintln(os.Stderr, "Usage: cspkg inspect <file.cspkg>")
			os.Exit(1)
		}
		cspkgFile := os.Args[2]
		info, err := cspkg.Inspect(cspkgFile)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error inspecting package: %v\n", err)
			os.Exit(1)
		}

		fmt.Printf("=== Config Studio Package: %s ===\n", filepath.Base(cspkgFile))
		fmt.Printf("ID:          %s\n", info.ID)
		fmt.Printf("Name:        %s\n", info.Name)
		fmt.Printf("Version:     v%s\n", info.Version)
		fmt.Printf("Author:      %s\n", info.Author)
		fmt.Printf("Description: %s\n", info.Description)
		fmt.Printf("Format Ver:  %d\n", info.FormatVer)
		fmt.Printf("SHA-256:     %s\n", info.Checksum)
		fmt.Printf("Files (%d): \n", len(info.Files))
		for _, f := range info.Files {
			fmt.Printf("  - %s\n", f)
		}
		fmt.Printf("Packed Size:   %d bytes\n", info.PackedSize)
		fmt.Printf("Total Payload: %d bytes\n", info.TotalSize)

	case "unpack":
		var cspkgFile string
		var targetDir string
		args := os.Args[2:]
		for i := 0; i < len(args); i++ {
			if args[i] == "-o" && i+1 < len(args) {
				targetDir = args[i+1]
				i++
			} else if strings.HasPrefix(args[i], "-o=") {
				targetDir = strings.TrimPrefix(args[i], "-o=")
			} else if !strings.HasPrefix(args[i], "-") && cspkgFile == "" {
				cspkgFile = args[i]
			}
		}

		if cspkgFile == "" {
			fmt.Fprintln(os.Stderr, "Usage: cspkg unpack <file.cspkg> [-o <target-dir>]")
			os.Exit(1)
		}
		if targetDir == "" {
			targetDir = "./" + strings.TrimSuffix(filepath.Base(cspkgFile), filepath.Ext(cspkgFile))
		}

		fmt.Printf("Unpacking %q -> %q ...\n", cspkgFile, targetDir)
		info, err := cspkg.Unpack(cspkgFile, targetDir)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error unpacking: %v\n", err)
			os.Exit(1)
		}

		fmt.Printf("✓ Unpacked %s v%s (%d files) into %s\n", info.Name, info.Version, len(info.Files), targetDir)

	case "validate":
		if len(os.Args) < 3 {
			fmt.Fprintln(os.Stderr, "Usage: cspkg validate <file.cspkg>")
			os.Exit(1)
		}
		cspkgFile := os.Args[2]
		info, err := cspkg.Inspect(cspkgFile)
		if err != nil {
			fmt.Fprintf(os.Stderr, "✗ Validation FAILED: %v\n", err)
			os.Exit(1)
		}
		fmt.Printf("✓ Valid Config Studio Package: %s v%s [SHA-256: %s]\n", info.ID, info.Version, info.Checksum)

	default:
		printUsage()
		os.Exit(1)
	}
}
