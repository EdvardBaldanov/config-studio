package server

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"config-studio/internal/config"
	appfs "config-studio/internal/fs"
	"config-studio/internal/plugin"
)

func setupTestServerWithWorkspaces(t *testing.T) (*Server, string, func()) {
	tmpDir, err := os.MkdirTemp("", "cs-srv-workspaces-test-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}

	dataDir := filepath.Join(tmpDir, "data")
	defaultDir := filepath.Join(tmpDir, "configs")
	_ = os.MkdirAll(defaultDir, 0755)

	cfgMgr, err := config.NewManager(dataDir)
	if err != nil {
		t.Fatalf("failed to init config manager: %v", err)
	}

	wm, err := appfs.NewWorkspaceManager(dataDir, defaultDir)
	if err != nil {
		t.Fatalf("failed to init workspace manager: %v", err)
	}

	fsSvc, err := appfs.NewServiceWithManager(wm)
	if err != nil {
		t.Fatalf("failed to init fs service: %v", err)
	}

	runner := plugin.NewRunner()
	pluginMgr, err := plugin.NewManager(dataDir, runner)
	if err != nil {
		t.Fatalf("failed to init plugin manager: %v", err)
	}

	srv := NewServer(Config{}, cfgMgr, fsSvc, pluginMgr, runner, nil, nil)

	cleanup := func() {
		os.RemoveAll(tmpDir)
	}

	return srv, tmpDir, cleanup
}

func doWebReq(srv *Server, req *http.Request) *httptest.ResponseRecorder {
	req.Header.Set("X-ConfigStudio-Web", "1")
	w := httptest.NewRecorder()
	srv.handler.ServeHTTP(w, req)
	return w
}

func TestWorkspacesEndpoints(t *testing.T) {
	srv, tmpDir, cleanup := setupTestServerWithWorkspaces(t)
	defer cleanup()

	// 1. GET /api/workspaces -> initially 1 default root
	req := httptest.NewRequest("GET", "/api/workspaces", nil)
	w := doWebReq(srv, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var listRes struct {
		Workspaces  []appfs.WorkspaceRoot `json:"workspaces"`
		DefaultRoot string                `json:"defaultRoot"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &listRes); err != nil {
		t.Fatalf("failed to parse workspaces response: %v", err)
	}
	if len(listRes.Workspaces) != 1 || listRes.Workspaces[0].ID != "default" {
		t.Fatalf("unexpected initial workspaces: %+v", listRes)
	}

	// 2. POST /api/workspaces -> add new root (nginx)
	nginxPath := filepath.Join(tmpDir, "nginx-configs")
	addBody, _ := json.Marshal(map[string]any{
		"id":       "nginx",
		"name":     "Nginx Fleet",
		"path":     nginxPath,
		"readOnly": false,
		"icon":     "server",
	})
	req = httptest.NewRequest("POST", "/api/workspaces", bytes.NewReader(addBody))
	req.Header.Set("Content-Type", "application/json")
	w = doWebReq(srv, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", w.Code, w.Body.String())
	}

	// 3. POST /api/fs/file with root=nginx -> create a config
	saveBody, _ := json.Marshal(map[string]any{
		"root":    "nginx",
		"path":    "nginx.conf",
		"content": "worker_processes auto;",
	})
	req = httptest.NewRequest("POST", "/api/fs/file", bytes.NewReader(saveBody))
	req.Header.Set("Content-Type", "application/json")
	w = doWebReq(srv, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 on save, got %d: %s", w.Code, w.Body.String())
	}

	// 4. GET /api/fs/tree?root=nginx
	req = httptest.NewRequest("GET", "/api/fs/tree?root=nginx", nil)
	w = doWebReq(srv, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 on tree, got %d: %s", w.Code, w.Body.String())
	}
	var treeRes struct {
		Root  string           `json:"root"`
		Items []appfs.FileItem `json:"items"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &treeRes); err != nil {
		t.Fatalf("failed to parse tree response: %v", err)
	}
	if len(treeRes.Items) != 1 || treeRes.Items[0].Name != "nginx.conf" {
		t.Fatalf("expected nginx.conf in tree, got %+v", treeRes)
	}
	if treeRes.Items[0].Root != "nginx" || treeRes.Items[0].FullRelPath != "nginx:nginx.conf" {
		t.Errorf("unexpected tree item properties: %+v", treeRes.Items[0])
	}

	// 5. GET /api/fs/file?root=nginx&path=nginx.conf
	req = httptest.NewRequest("GET", "/api/fs/file?root=nginx&path=nginx.conf", nil)
	w = doWebReq(srv, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 on get file, got %d: %s", w.Code, w.Body.String())
	}
	var fileRes struct {
		Root        string `json:"root"`
		Content     string `json:"content"`
		FullRelPath string `json:"fullRelPath"`
	}
	_ = json.Unmarshal(w.Body.Bytes(), &fileRes)
	if fileRes.Content != "worker_processes auto;" || fileRes.FullRelPath != "nginx:nginx.conf" {
		t.Errorf("unexpected get file response: %+v", fileRes)
	}

	// 6. PUT /api/workspaces/nginx -> update root
	updateBody, _ := json.Marshal(map[string]any{
		"name":     "Nginx Renamed",
		"readOnly": true,
	})
	req = httptest.NewRequest("PUT", "/api/workspaces/nginx", bytes.NewReader(updateBody))
	req.Header.Set("Content-Type", "application/json")
	w = doWebReq(srv, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 on update, got %d: %s", w.Code, w.Body.String())
	}

	// 7. Verify readOnly rejects writes
	saveBody2, _ := json.Marshal(map[string]any{
		"root":    "nginx",
		"path":    "fail.conf",
		"content": "cannot write",
	})
	req = httptest.NewRequest("POST", "/api/fs/file", bytes.NewReader(saveBody2))
	req.Header.Set("Content-Type", "application/json")
	w = doWebReq(srv, req)

	if w.Code == http.StatusOK {
		t.Errorf("expected write to fail on read-only root, got 200")
	}

	// 8. DELETE /api/workspaces/nginx
	req = httptest.NewRequest("DELETE", "/api/workspaces/nginx", nil)
	w = doWebReq(srv, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 on delete, got %d: %s", w.Code, w.Body.String())
	}

	// File on disk must still exist!
	if _, err := os.Stat(filepath.Join(nginxPath, "nginx.conf")); err != nil {
		t.Errorf("expected physical file to remain untouched after deleting workspace root, but got: %v", err)
	}
}
