"use client";

import { useState } from "react";
import SiteChrome from "../site-chrome";
import "./commission.css";

const pricePerPage = 1000;

export default function CommissionPage() {
  const [pages, setPages] = useState("");
  const total = (Number.parseInt(pages, 10) || 0) * pricePerPage;
  const formattedTotal = `Rp ${total.toLocaleString("id-ID")}`;

  function submitOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get("judul") || "").trim();
    const body = [
      "Halo, saya ingin order komisi terjemahan doujinshi.",
      "",
      "=== DATA ORDER ===",
      `Nama / Username : ${String(form.get("nama") || "").trim()}`,
      `Kontak          : ${String(form.get("kontak") || "").trim()}`,
      `Judul           : ${title}`,
      `Link Raw        : ${String(form.get("link") || "").trim()}`,
      `Jumlah Halaman  : ${pages} halaman`,
      `Total Biaya     : ${formattedTotal}`,
      `Bukti Bayar     : ${String(form.get("bukti") || "").trim()}`,
      "",
      "Catatan:",
      String(form.get("catatan") || "").trim() || "-",
      "",
      "Pesanan ini dikirim via Form Komisi Mikorokuscan.",
      "Terima kasih!",
    ].join("\n");
    const mailto = new URL("mailto:mikorokuscan@gmail.com");
    mailto.searchParams.set("subject", `[KOMISI TERJEMAHAN] ${title}`);
    mailto.searchParams.set("body", body);
    window.location.href = mailto.toString();
  }

  return (
    <>
      <SiteChrome showFooter={false} />
      <main className="commission-page route-page-background">
        <section className="commission-card">
          <header>
            <h1>Form Komisi Terjemahan</h1>
            <p>Doujinshi Translation Commission</p>
            <span className="commission-price">Rp 1.000 / halaman</span>
          </header>
          <form onSubmit={submitOrder}>
            <label>Nama / Username <span>*</span><input name="nama" required maxLength={100} placeholder="Contoh: @username atau Nama Asli" /></label>
            <label>Kontak (Email / Discord / WA) <span>*</span><input name="kontak" required maxLength={150} placeholder="email@gmail.com atau Discord#0000" /></label>
            <label>Judul Doujinshi <span>*</span><input name="judul" required maxLength={200} placeholder="Judul lengkap doujinshi" /></label>
            <label>Link Raw <span>*</span><input name="link" type="url" required placeholder="https://..." /></label>
            <label>Jumlah Halaman <span>*</span><input name="halaman" type="number" min="1" max="1000" required value={pages} onChange={(event) => setPages(event.target.value)} placeholder="Contoh: 24" /></label>
            <div className="commission-total"><span>Total Biaya</span><strong>{formattedTotal}</strong></div>
            <div className="commission-payment"><p>Lakukan pembayaran sesuai total biaya di atas melalui Trakteer:</p><a href="https://trakteer.id/mikorokuscan" target="_blank" rel="noreferrer">Bayar via Trakteer (mikorokuscan)</a></div>
            <label>Bukti Pembayaran (Nama Akun Trakteer / Link Gambar) <span>*</span><input name="bukti" required maxLength={500} placeholder="Contoh: Akun Trakteer @nama_kamu atau Link Gambar" /></label>
            <label>Catatan Tambahan<textarea name="catatan" maxLength={2000} placeholder="Preferensi gaya terjemahan, permintaan khusus, dll (opsional)" /></label>
            <button type="submit">Kirim Komisi</button>
          </form>
          <section className="commission-faq">
            <h2>Ketentuan &amp; Q&amp;A Komisi</h2>
            <div><strong>Berapa lama proses pengerjaannya?</strong><p>Komisi umumnya akan dikerjakan dalam kurun waktu 1x24 jam setelah pembayaran terverifikasi, tergantung dari jumlah halaman yang dipesan.</p></div>
            <div><strong>Bagaimana sistem pengerjaannya?</strong><p>Pengerjaan dilakukan sesuai urutan antrean pesanan yang masuk. Jika sedang ada antrean, waktu mulai pengerjaan mungkin akan sedikit bergeser.</p></div>
            <div><strong>Bagaimana cara pengiriman hasil terjemahan?</strong><p>Hasil terjemahan akan dikirimkan langsung melalui kontak yang sudah kamu cantumkan pada form di atas.</p></div>
          </section>
        </section>
      </main>
      <SiteChrome showChrome={false} />
    </>
  );
}
