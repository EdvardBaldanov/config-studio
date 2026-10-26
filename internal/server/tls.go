package server

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/pem"
	"fmt"
	"math/big"
	"net"
	"os"
	"path/filepath"
	"time"
)

// EnsureSelfSignedCert checks for cert.pem and key.pem in certDir.
// If missing, it generates a new self-signed TLS certificate valid for all local interfaces and IPs.
func EnsureSelfSignedCert(certDir string) (certPath, keyPath string, err error) {
	if err := os.MkdirAll(certDir, 0755); err != nil {
		return "", "", fmt.Errorf("failed to create cert directory: %w", err)
	}

	certPath = filepath.Join(certDir, "cert.pem")
	keyPath = filepath.Join(certDir, "key.pem")

	// If both files exist and are non-empty, reuse them
	if cStat, err := os.Stat(certPath); err == nil && cStat.Size() > 0 {
		if kStat, err := os.Stat(keyPath); err == nil && kStat.Size() > 0 {
			return certPath, keyPath, nil
		}
	}

	privKey, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		return "", "", fmt.Errorf("failed to generate ecdsa key: %w", err)
	}

	serialNumberLimit := new(big.Int).Lsh(big.NewInt(1), 128)
	serialNumber, err := rand.Int(rand.Reader, serialNumberLimit)
	if err != nil {
		return "", "", fmt.Errorf("failed to generate serial number: %w", err)
	}

	template := x509.Certificate{
		SerialNumber: serialNumber,
		Subject: pkix.Name{
			Organization: []string{"Config Studio Self-Signed"},
			CommonName:   "Config Studio",
		},
		NotBefore:             time.Now().Add(-1 * time.Hour),
		NotAfter:              time.Now().Add(10 * 365 * 24 * time.Hour), // 10 years
		KeyUsage:              x509.KeyUsageDigitalSignature | x509.KeyUsageKeyEncipherment,
		ExtKeyUsage:           []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth},
		BasicConstraintsValid: true,
	}

	// Add local hostnames and IPs
	template.DNSNames = []string{"localhost", "config-studio.local"}
	template.IPAddresses = []net.IP{net.ParseIP("127.0.0.1"), net.ParseIP("::1")}

	// Collect local network interface IPs (e.g. 192.168.x.x, 10.x.x.x)
	if ifaces, err := net.Interfaces(); err == nil {
		for _, iface := range ifaces {
			if addrs, err := iface.Addrs(); err == nil {
				for _, addr := range addrs {
					var ip net.IP
					switch v := addr.(type) {
					case *net.IPNet:
						ip = v.IP
					case *net.IPAddr:
						ip = v.IP
					}
					if ip != nil && !ip.IsLoopback() {
						template.IPAddresses = append(template.IPAddresses, ip)
					}
				}
			}
		}
	}

	derBytes, err := x509.CreateCertificate(rand.Reader, &template, &template, &privKey.PublicKey, privKey)
	if err != nil {
		return "", "", fmt.Errorf("failed to create certificate: %w", err)
	}

	// Write cert.pem
	certOut, err := os.Create(certPath)
	if err != nil {
		return "", "", fmt.Errorf("failed to open cert.pem for writing: %w", err)
	}
	defer certOut.Close()
	if err := pem.Encode(certOut, &pem.Block{Type: "CERTIFICATE", Bytes: derBytes}); err != nil {
		return "", "", fmt.Errorf("failed to write data to cert.pem: %w", err)
	}

	// Write key.pem
	keyOut, err := os.OpenFile(keyPath, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, 0600)
	if err != nil {
		return "", "", fmt.Errorf("failed to open key.pem for writing: %w", err)
	}
	defer keyOut.Close()
	privBytes, err := x509.MarshalECPrivateKey(privKey)
	if err != nil {
		return "", "", fmt.Errorf("failed to marshal private key: %w", err)
	}
	if err := pem.Encode(keyOut, &pem.Block{Type: "EC PRIVATE KEY", Bytes: privBytes}); err != nil {
		return "", "", fmt.Errorf("failed to write data to key.pem: %w", err)
	}

	return certPath, keyPath, nil
}
