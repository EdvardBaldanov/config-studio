package agent

import (
	"testing"
	"time"
)

func TestTOTPRFC6238Vectors(t *testing.T) {
	// RFC 6238 Appendix B test secret: "12345678901234567890" (20 bytes)
	// Base32: "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ"
	secret := "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ"

	tests := []struct {
		timestamp int64
		expected  string
	}{
		{59, "287082"},
		{1111111109, "081804"},
		{1111111111, "050471"},
		{1234567890, "005924"},
		{2000000000, "279037"},
	}

	for _, tc := range tests {
		tm := time.Unix(tc.timestamp, 0)
		code, err := GenerateTOTP(secret, tm, 6)
		if err != nil {
			t.Fatalf("GenerateTOTP failed for %d: %v", tc.timestamp, err)
		}
		if code != tc.expected {
			t.Errorf("At timestamp %d: expected %s, got %s", tc.timestamp, tc.expected, code)
		}

		// Validation check
		valid, step := ValidateTOTP(secret, code, tm, 1, 6)
		if !valid {
			t.Errorf("ValidateTOTP failed for %d with code %s", tc.timestamp, code)
		}
		expectedStep := tc.timestamp / 30
		if step != expectedStep {
			t.Errorf("Step mismatch: expected %d, got %d", expectedStep, step)
		}
	}
}

func TestTOTPWindowDrift(t *testing.T) {
	secret := "JBSWY3DPEHPK3PXP"
	now := time.Now()

	// Code from 25 seconds ago (within current or -1 step)
	pastTime := now.Add(-25 * time.Second)
	code, err := GenerateTOTP(secret, pastTime, 6)
	if err != nil {
		t.Fatal(err)
	}

	valid, _ := ValidateTOTP(secret, code, now, 1, 6)
	if !valid {
		t.Errorf("Expected code from 25s ago to be valid with window=1")
	}

	// Code from 120 seconds ago (outside window=1)
	farPast := now.Add(-120 * time.Second)
	farCode, _ := GenerateTOTP(secret, farPast, 6)
	validFar, _ := ValidateTOTP(secret, farCode, now, 1, 6)
	if validFar {
		t.Errorf("Expected code from 120s ago to be rejected with window=1")
	}
}
