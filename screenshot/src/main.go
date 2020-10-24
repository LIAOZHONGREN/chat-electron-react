package main

import (
	"C"
	"bytes"

	"github.com/kbinani/screenshot"
)
import (
	"encoding/base64"
	"image/png"
)

//export Screenshot
func Screenshot() *C.char {
	bounds := screenshot.GetDisplayBounds(0)
	img, err := screenshot.CaptureRect(bounds)
	if err != nil {
		panic(err)
	}
	emptyBuff := bytes.NewBuffer(nil)
	png.Encode(emptyBuff, img)
	imgBytes := emptyBuff.Bytes()
	encoding := base64.URLEncoding
	dist := make([]byte, encoding.EncodedLen(emptyBuff.Len()))
	encoding.Encode(dist, imgBytes)
	str := string(dist)
	return C.CString(str)
}

func main() {}

//编译 dll
//go build -buildmode=c-shared -o screenshot.dll main.go
