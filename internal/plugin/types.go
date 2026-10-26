package plugin

import (
	"strings"
	"time"
)

// LanguagePackDef defines a full core UI language pack contributed by a plugin.
type LanguagePackDef struct {
	Code         string            `json:"code"`                   // e.g. "de", "zh", "es", "fr"
	Name         string            `json:"name"`                   // e.g. "Deutsch", "中文"
	Flag         string            `json:"flag,omitempty"`         // e.g. "🇩🇪", "🇨🇳"
	Translations map[string]string `json:"translations,omitempty"` // Core UI translations dictionary
}

// Manifest defines the structure of plugin.json inside a plugin directory.
type Manifest struct {
	ID            string                       `json:"id"`
	Name          string                       `json:"name"`
	Version       string                       `json:"version"`
	Description   string                       `json:"description"`
	Author        string                       `json:"author,omitempty"`
	Homepage      string                       `json:"homepage,omitempty"`
	Icon          string                       `json:"icon,omitempty"`          // Lucide icon name or svg
	Entry         string                       `json:"entry"`                   // e.g. "main.js"
	CSS              string                       `json:"css,omitempty"`              // optional "style.css"
	Permissions      []string                     `json:"permissions,omitempty"`      // e.g. ["ui.panels", "terminal.exec", "network.bind", "service:ssh"]
	FileMatches      []string                     `json:"fileMatches,omitempty"`      // e.g. [".html", ".php", ".js"]
	MinAppVersion        string                       `json:"minAppVersion,omitempty"`
	Dependencies         map[string]string            `json:"dependencies,omitempty"`         // pluginId -> versionConstraint (e.g. ">=1.0.0", "*")
	OptionalDependencies map[string]string            `json:"optionalDependencies,omitempty"` // pluginId -> versionConstraint for soft/optional dependencies
	ProvidesServices     []string                     `json:"providesServices,omitempty"`     // service identifiers exposed by this plugin
	Locales          map[string]map[string]string `json:"locales,omitempty"`         // Per-language dictionary for plugin's own UI
	Localization     *LanguagePackDef             `json:"localization,omitempty"`    // For Core UI language pack plugins
}

// Plugin represents an installed plugin and its runtime state.
type Plugin struct {
	Manifest
	Enabled     bool      `json:"enabled"`
	Dir         string    `json:"dir,omitempty"`
	PackageFile string    `json:"packageFile,omitempty"` // Path to .cspkg single-file package if installed
	InstalledAt time.Time `json:"installedAt"`
	Builtin     bool      `json:"builtin"`
	Dependents  []string  `json:"dependents,omitempty"` // IDs of active plugins that depend on this plugin
}

// ExecRequest represents a command execution request from a plugin.
type ExecRequest struct {
	PluginID  string   `json:"pluginId"`
	Command   string   `json:"command"`
	Args      []string `json:"args"`
	Cwd       string   `json:"cwd,omitempty"`
	Confirmed bool     `json:"confirmed,omitempty"`
}

// ExecResponse represents the output of a command execution.
type ExecResponse struct {
	ExitCode        int    `json:"exitCode"`
	Stdout          string `json:"stdout"`
	Stderr          string `json:"stderr"`
	DurationMs      int64  `json:"durationMs"`
	RequiresConfirm bool   `json:"requiresConfirm,omitempty"`
	Warning         string `json:"warning,omitempty"`
	Error           string `json:"error,omitempty"`
}

// ProcessInfo represents a running background process spawned by a plugin.
type ProcessInfo struct {
	ID        string    `json:"id"`
	PluginID  string    `json:"pluginId"`
	Command   string    `json:"command"`
	Args      []string  `json:"args"`
	Pid       int       `json:"pid"`
	Port      int       `json:"port,omitempty"`
	StartedAt time.Time `json:"startedAt"`
	Status    string    `json:"status"` // "running", "stopped", "failed"
}

// DependencyIssue reports a missing, disabled, or incompatible plugin dependency.
type DependencyIssue struct {
	PluginID  string `json:"pluginId"`
	Required  string `json:"required"`
	Installed string `json:"installed,omitempty"`
	Status    string `json:"status"` // "missing", "incompatible", "disabled"
	Optional  bool   `json:"optional,omitempty"`
}

// DependencyInUseError indicates that a plugin cannot be disabled/deleted because other plugins depend on it.
type DependencyInUseError struct {
	PluginID   string
	Dependents []string
}

func (e *DependencyInUseError) Error() string {
	return "plugin \"" + e.PluginID + "\" cannot be disabled or deleted because active plugins depend on it: " + strings.Join(e.Dependents, ", ")
}

// PendingInstall represents an inspected plugin awaiting user consent.
type PendingInstall struct {
	TempKey          string            `json:"tempKey"`
	Manifest         Manifest          `json:"manifest"`
	IsOfficial       bool              `json:"isOfficial"`
	DependencyIssues []DependencyIssue `json:"dependencyIssues,omitempty"`
	TempDir          string            `json:"-"`
	PluginDir        string            `json:"-"`
	PackageFile      string            `json:"-"` // Original or staged .cspkg file
	CreatedAt        time.Time         `json:"createdAt"`
}

