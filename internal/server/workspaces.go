package server

import (
	"encoding/json"
	"net/http"
	"strings"

	appfs "config-studio/internal/fs"
)

// handleListWorkspaces returns all configured workspace roots filtered by server target.
func (s *Server) handleListWorkspaces(w http.ResponseWriter, r *http.Request) {
	serverTarget := r.URL.Query().Get("server")
	if serverTarget == "" {
		serverTarget = r.Header.Get("X-Remote-Target")
	}

	if s.fs == nil || s.fs.Workspaces == nil {
		workDir := ""
		if s.fs != nil {
			workDir = s.fs.WorkDir
		}
		jsonResponse(w, http.StatusOK, map[string]any{
			"workspaces": []appfs.WorkspaceRoot{
				{
					ID:       "default",
					Name:     "Configs",
					Path:     workDir,
					ReadOnly: false,
					Icon:     "folder",
					Order:    1,
					Server:   "local",
				},
			},
			"defaultRoot": "default",
		})
		return
	}

	roots := s.fs.Workspaces.ListForServer(serverTarget)
	defaultRoot := ""
	if len(roots) > 0 {
		defaultRoot = roots[0].ID
	}

	jsonResponse(w, http.StatusOK, map[string]any{
		"workspaces":  roots,
		"defaultRoot": defaultRoot,
	})
}

// handleAddWorkspace adds a new workspace root to workspaces.yaml.
func (s *Server) handleAddWorkspace(w http.ResponseWriter, r *http.Request) {
	if s.fs == nil || s.fs.Workspaces == nil {
		jsonError(w, http.StatusInternalServerError, "workspace manager not initialized")
		return
	}

	var root appfs.WorkspaceRoot
	if err := json.NewDecoder(r.Body).Decode(&root); err != nil {
		jsonError(w, http.StatusBadRequest, "invalid request body: "+err.Error())
		return
	}

	serverTarget := r.URL.Query().Get("server")
	if serverTarget == "" {
		serverTarget = r.Header.Get("X-Remote-Target")
	}
	if strings.TrimSpace(root.Server) == "" {
		root.Server = serverTarget
	}

	root.ID = strings.TrimSpace(root.ID)
	root.Path = strings.TrimSpace(root.Path)
	if root.ID == "" || root.Path == "" {
		jsonError(w, http.StatusBadRequest, "id and path are required")
		return
	}

	if err := s.fs.Workspaces.Add(root); err != nil {
		jsonError(w, http.StatusBadRequest, err.Error())
		return
	}

	created, _ := s.fs.Workspaces.Get(root.ID)
	jsonResponse(w, http.StatusCreated, created)
}

// handleUpdateWorkspace updates an existing workspace root.
func (s *Server) handleUpdateWorkspace(w http.ResponseWriter, r *http.Request) {
	if s.fs == nil || s.fs.Workspaces == nil {
		jsonError(w, http.StatusInternalServerError, "workspace manager not initialized")
		return
	}

	id := r.PathValue("id")
	if id == "" {
		jsonError(w, http.StatusBadRequest, "workspace id parameter is required")
		return
	}

	var root appfs.WorkspaceRoot
	if err := json.NewDecoder(r.Body).Decode(&root); err != nil {
		jsonError(w, http.StatusBadRequest, "invalid request body: "+err.Error())
		return
	}
	root.ID = id

	if err := s.fs.Workspaces.Update(root); err != nil {
		jsonError(w, http.StatusBadRequest, err.Error())
		return
	}

	updated, _ := s.fs.Workspaces.Get(id)
	jsonResponse(w, http.StatusOK, updated)
}

// handleDeleteWorkspace removes a workspace root from workspaces.yaml.
func (s *Server) handleDeleteWorkspace(w http.ResponseWriter, r *http.Request) {
	if s.fs == nil || s.fs.Workspaces == nil {
		jsonError(w, http.StatusInternalServerError, "workspace manager not initialized")
		return
	}

	id := r.PathValue("id")
	if id == "" {
		jsonError(w, http.StatusBadRequest, "workspace id parameter is required")
		return
	}

	if err := s.fs.Workspaces.Delete(id); err != nil {
		jsonError(w, http.StatusBadRequest, err.Error())
		return
	}

	jsonResponse(w, http.StatusOK, map[string]string{
		"status": "deleted",
		"id":     id,
	})
}

// handleReloadWorkspaces forces a reload of workspaces.yaml from disk.
func (s *Server) handleReloadWorkspaces(w http.ResponseWriter, r *http.Request) {
	if s.fs == nil || s.fs.Workspaces == nil {
		jsonError(w, http.StatusInternalServerError, "workspace manager not initialized")
		return
	}

	if err := s.fs.Workspaces.Reload(); err != nil {
		jsonError(w, http.StatusInternalServerError, "failed to reload workspaces: "+err.Error())
		return
	}

	jsonResponse(w, http.StatusOK, map[string]any{
		"status":      "reloaded",
		"workspaces":  s.fs.Workspaces.List(),
		"defaultRoot": s.fs.Workspaces.DefaultRoot(),
	})
}
