---
title: "TBCTF – something [Rev]"
description: "Writeup chi tiết bài reverse engineering 'something' tại TBCTF. Binary Go sử dụng memfrob (XOR 42) và chuỗi XOR key để mã hóa flag."
date: 2025-06-29
category: writeup
tags: [ctf, rev, go, xor, memfrob, tbctf]
---

> **CTF:** TBCTF  
> **Category:** Reverse Engineering  
> **Flag:** `TBCTF{r3v_x0r_m3mfr0b!}`

---

## 1. Thông tin bài

Bài cung cấp một file nén `something.zip`, bên trong là một binary ELF 64-bit duy nhất tên `chall`.
Tên bài "something" không cho gợi ý gì — nhiệm vụ là tự tìm ra nó làm gì.

---

## 2. Chạy thử file gốc

Việc đầu tiên luôn là **chạy thử binary** để hiểu hành vi bề mặt:

```bash
$ chmod +x chall
$ ./chall
```


<img src="/tracebashCTF/runchall.png" style="width: 80%; max-width: 700px; display: block; margin: 0 auto;" />

Binary in ra một đoạn text (prompt nhập flag), chờ người dùng nhập, rồi phản hồi đúng/sai.
Thử nhập bừa:

```
TBCTF{test}
```

Nhập sai thì in thông báo lỗi. Không crash, không timeout — đây là **checker đơn giản**: nhận input, so sánh, trả kết quả.

---

## 3. Phân tích tĩnh ban đầu

### 3.1 Xác định loại file

```bash
$ file chall
```
<img src="/tracebashCTF/filechall.png" style="width: 100%; max-width: 700px; display: block; margin: 0 auto;" />

**Binary được viết bằng Go** và link tĩnh (statically linked). Điều này quan trọng vì:
- Go không dùng glibc — mọi thứ kể cả runtime đều nằm trong file
- Binary sẽ rất lớn và CFG trong IDA trông rất "bẩn" (nhiều block runtime nhiễu)
- Nhưng Go **giữ nguyên symbol names** — không bị strip → đây là lợi thế lớn

### 3.2 Dùng `strings` tìm điểm bám

```bash
$ strings chall | grep -E "TBCTF|enc|main\."
```

Kết quả quan trọng:

```
TBCTF{
main.encPrompt       ← chuỗi prompt (đã mã hóa)
main.encCorrect      ← dữ liệu flag đúng (đã mã hóa)
main.encIncorrect    ← thông báo sai (đã mã hóa)
main.encFake3        ← fake flag (bẫy)
main.reallocate_memory_region  ← hàm so sánh flag
main.flagState
```

Ngay lập tức thấy pattern: binary **không lưu flag plaintext** mà lưu dưới dạng mã hóa.
Tất cả chuỗi output (prompt, đúng, sai) đều mã hóa cùng một kiểu rồi giải mã runtime khi cần in.

---

## 4. Phân tích sâu với IDA Pro / Ghidra

### 4.1 Mở binary

> 📷 *[ảnh: IDA Pro mở chall, danh sách Functions với các hàm main.*]*

Vào **Functions window**, lọc theo `main.` — thấy ngay các hàm liên quan:
- `main.main` — hàm chính
- `main.reallocate_memory_region` — hàm so sánh flag thực

Graph View trông rất rối vì Go compiler tự chèn **stack growth check**, **bounds check**, và các lời gọi runtime vào mọi nơi. Đây không phải obfuscation — chỉ là đặc điểm của Go binary.

**Giải pháp:** dùng **F5 (Hex-Rays decompiler)** để ra pseudocode, dễ đọc hơn nhiều.


### 4.2 Luồng gọi hàm tổng thể

```
main_main
│
├─ tính key_base (XOR "TBCTF{")          ← dùng để decrypt chuỗi output
├─ decrypt + in encPrompt
├─ đọc input → TrimSpace
├─ check format "TBCTF{...}"
├─ check ssh trap → in encFake3 nếu khớp
│
└─ gọi main_reallocate_memory_region(input[6:-1])
        │
        ├─ check len == 16
        ├─ reverse input
        ├─ XOR 0xD7, XOR 0x2A
        ├─ tự tính lại key_base bên trong
        ├─ decrypt encExpected
        └─ so sánh → trả về true/false
                │
                ▼ (quay về main_main)
          true  → decrypt + in encCorrect
          false → decrypt + in encIncorrect
```

`main_main` gọi `main_reallocate_memory_region` **một lần duy nhất**, nhận true/false về rồi quyết định in gì. Toàn bộ logic kiểm tra flag nằm trong hàm đó.

---

## 5. Phân tích từng phần

### 5.1 `key_base` trong `main_main` — dùng để làm gì?

IDA decompile ra đoạn tính `key_base` (`v5`) trong `main_main`:

```c
// code IDA — main_main
while ( v4 < 6 )
{
    v0.str = (uint8 *)(unsigned __int8)aTbctf[v4];
    v5 ^= LODWORD(v0.str);   // v5 = key_base, tích lũy XOR từng byte
    ++v4;
}
// v5 = 0x54^0x42^0x43^0x54^0x46^0x7B = 0x3C
```

`aTbctf` là chuỗi `"TBCTF{"`. Vòng lặp XOR 6 byte → `key_base = 0x3C`.

`key_base` này được dùng ở **4 chỗ trong `main_main`**, tất cả đều để **decrypt chuỗi hiển thị**:

```c
// Chỗ 1: decrypt encPrompt → in ra prompt hỏi nhập flag
v7[v0.len] = v5 ^ array[v0.len] ^ 0x2A;
//           ^^               ^^ 0x2A = memfrob

// Chỗ 2: decrypt encFake3 → in fake flag (ssh trap)
v48[...] = v27 ^ v25[...] ^ 0x2A;

// Chỗ 3: decrypt encCorrect → in thông báo đúng
v43[...] = v33 ^ v31[...] ^ 0x2A;

// Chỗ 4: decrypt encIncorrect → in thông báo sai
v38[...] = v36 ^ v34[...] ^ 0x2A;
```

Pattern giống nhau hoàn toàn: `key_base ^ encrypted[i] ^ 0x2A`.
`^ 0x2A` chính là **`memfrob`** — hàm glibc XOR mỗi byte với 42. Tên flag `r3v_x0r_m3mfr0b!` gợi ý điều này.

> Lưu ý: IDA sinh pseudocode xấu ở đây (warning "local variable allocation has failed") vì `main_main` quá lớn. Mỗi chỗ dùng `key_base` đều thấy IDA tính lại `v27`, `v33`, `v36`... thực ra đều là cùng giá trị `0x3C` — chỉ là IDA không track được xuyên suốt.

### 5.2 Kiểm tra format — đọc code IDA

```c
// code IDA — main_main
if ( (((unsigned __int64)*((unsigned __int16 *)v16 + 2) << 32) | *v16) != 0x7B4654434254LL
  || *((_BYTE *)v16 + 9) != 125 )
```

Trông phức tạp nhưng thực ra chỉ là: Go so sánh 6 byte một lúc bằng cast `uint32`/`uint16` cho nhanh:

```
// IDA viết literal này là "{FTCBT" — đọc từng byte hex từ cao xuống thấp:
// 7B='{' 46='F' 54='T' 43='C' 42='B' 54='T'
// Nhưng trong memory (little-endian) các byte xếp ngược lại:
// 54 42 43 54 46 7B = 'T''B''C''T''F''{' = "TBCTF{"
*((_BYTE *)v16 + 9) != '}' // ký tự tại index 9 phải là '}'
```

→ Kiểm tra input bắt đầu bằng `"TBCTF{"` và byte tại vị trí 9 là `"}"`.

### 5.3 Bẫy fake flag — đọc code IDA

```c
// code IDA — main_main
if ( *(_BYTE *)v22 != 115 )   // 's'
    goto LABEL_34;
if ( *((_BYTE *)v22 + 1) != 115 )  // 's'
    goto LABEL_34;
if ( *((_BYTE *)v22 + 2) != 104 )  // 'h'
    goto LABEL_34;
// nếu qua được 3 check trên → tính hash
while ( v24 < 3 )
{
    *(_DWORD *)&v15[8] = *(_DWORD *)v15 + 17 * *(_DWORD *)&v15[8];
    ++v24;
}
if ( *(_DWORD *)&v15[8] == 305419896 )  // 0x12345678
    // in encFake3
```

Nếu 3 byte đầu nội dung là `'s','s','h'` (115, 115, 104) và hash `= c + 17*hash` bằng `0x12345678` → in fake flag. Đây là bẫy cho người thử mò input.

### 5.4 Hàm `main.reallocate_memory_region` — đọc code IDA

Tên hàm cố tình đặt nhầm để đánh lạc hướng. Đây là toàn bộ logic thực:

**Bước 1 — check độ dài:**
```c
// code IDA
if ( input.len == 16 )
```
Flag content phải đúng **16 ký tự**.

**Bước 2 — đảo ngược input:**
```c
// code IDA
for ( i = 15LL; (__int64)i > (__int64)v3; --i )
{
    v5 = *((_BYTE *)v19 + v3);
    *((_BYTE *)v19 + v3) = *((_BYTE *)v19 + i);
    *((_BYTE *)v19 + i) = v5;
    ++v3;
}
```
Swap từ 2 đầu vào giữa → reverse tại chỗ.

**Bước 3 — hai lớp XOR:**
```c
// code IDA
for ( j = 0LL; j < 16; ++j )
    *((_BYTE *)v19 + j) ^= 0xD7u;
for ( k = 0LL; k < 16; ++k )
    *((_BYTE *)v19 + k) ^= 0x2Au;
```
XOR `0xD7` rồi XOR `0x2A` — tương đương XOR một lần với `0xD7 ^ 0x2A = 0xFD`.

**Bước 4 — decrypt `encExpected` để lấy chuẩn so sánh:**
```c
// code IDA — bên trong vòng lặp m
while ( v13 < 6 )
    v14 ^= aTbctf[v13++];   // tính lại key_base = 0x3C
v15 = array[m] ^ v14;       // encExpected[m] ^ key_base
*((_BYTE *)v9 + m) = v15 ^ 0x2A;  // ^ 0x2A = memfrob
```
Hàm này **tự tính lại key_base** bên trong (không nhận từ `main_main`), rồi decrypt `encExpected` theo đúng công thức `encExpected ^ key_base ^ 0x2A`.

**Bước 5 — so sánh:**
```c
// code IDA
for ( n = 0LL; n < 16; ++n )
{
    if ( *((_BYTE *)v9 + n) != *((_BYTE *)v19 + n) )
        break;
}
```
Nếu vòng chạy hết 16 byte không `break` → flag đúng → trả về `true`.

---

## 6. Trích xuất `encCorrect`

Vào IDA, tìm symbol `main.encCorrect`:

<img src="/tracebashCTF/encCorrect.png" style="width: 100%; max-width: 700px; display: block; margin: 0 auto;" />

16 byte được lưu trực tiếp trong binary:

```
CA 89 DB 99 8D 86 D8 86 B4 99 DB 93 B4 9D D8 99
```

---

## 7. Giải ngược — Solve Script

Biết toàn bộ flow, giải ngược theo thứ tự ngược lại:

```
encCorrect → undo reallocate → undo key_base & memfrob → flag content
```

Chi tiết từng bước:

```python
encCorrect = [
    0xCA, 0x89, 0xDB, 0x99, 0x8D, 0x86, 0xD8, 0x86,
    0xB4, 0x99, 0xDB, 0x93, 0xB4, 0x9D, 0xD8, 0x99
]

# ① Tính key_base
key_base = 0
for b in b"TBCTF{":
    key_base ^= b          # = 0x3C

# ② Undo "decrypt rồi so sánh với encCorrect"
#    Binary làm: compare(key_base ^ encCorrect[i] ^ 0x2A, processed_content[i])
#    → processed_content[i] = key_base ^ encCorrect[i] ^ 0x2A
v9 = [b ^ key_base ^ 0x2A for b in encCorrect]

# ③ Undo XOR 0xD7 của reallocate_memory_region
flag_bytes = [b ^ 0x2A ^ 0xD7 for b in v9]
#   (rút gọn: v9[i] ^ 0xD7 = encCorrect[i] ^ 0x3C ^ 0x2A ^ 0xD7 = encCorrect[i] ^ 0xEB)

# ④ Undo reverse
flag_bytes.reverse()

print("TBCTF{" + "".join(chr(b) for b in flag_bytes) + "}")
```

<img src="/tracebashCTF/flag.png" style="width: 100%; max-width: 700px; display: block; margin: 0 auto;" />

---

## 8. Xác minh

```bash
$ python3 solve.py
TBCTF{r3v_x0r_m3mfr0b!}

$ ./chall
Enter flag: TBCTF{r3v_x0r_m3mfr0b!}
Correct!
```

<img src="/tracebashCTF/confirmFlag.png" style="width: 100%; max-width: 700px; display: block; margin: 0 auto;" />
---

