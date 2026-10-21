import SiteChrome from "./site-chrome";
import "./legal.css";

type LegalKind = "about" | "privacy" | "terms" | "dmca";

const content: Record<LegalKind, { title: string; children: React.ReactNode }> = {
  about: {
    title: "Tentang Mikoroku",
    children: <>
      <p>Mikoroku adalah platform online yang menyediakan berbagai konten hiburan digital seperti manga, manhwa, dan manhua yang dapat diakses secara gratis oleh pengguna.</p>
      <p>Kami bertujuan untuk menghadirkan pengalaman membaca yang mudah, cepat, dan nyaman bagi para penggemar komik digital dari berbagai genre. Dengan tampilan yang sederhana dan responsif, pengguna dapat menjelajahi berbagai judul favorit kapan saja dan di mana saja.</p>
      <p>Sebagian besar konten yang tersedia di Mikoroku dikumpulkan dari berbagai sumber di internet. Kami tidak mengklaim kepemilikan atas semua materi yang ditampilkan, dan seluruh hak cipta tetap menjadi milik masing-masing pemiliknya.</p>
      <h2>Visi Kami</h2><p>Menjadi platform baca komik online yang cepat, ringan, dan mudah diakses oleh semua pengguna, khususnya di perangkat mobile.</p>
      <h2>Misi Kami</h2><ul><li>Menyediakan akses gratis ke berbagai konten hiburan digital</li><li>Memberikan pengalaman membaca yang nyaman dan minimal gangguan</li><li>Terus meningkatkan performa dan kualitas website</li></ul>
      <h2>Catatan Penting</h2><p>Mikoroku mungkin menampilkan konten yang tidak sesuai untuk anak di bawah umur. Pengguna diharapkan menggunakan situs ini dengan bijak sesuai usia dan hukum yang berlaku di wilayah masing-masing.</p>
      <h2>Kontak</h2><p>Jika Anda memiliki pertanyaan, laporan, atau permintaan penghapusan konten, silakan hubungi kami melalui <a href="mailto:mikorokuscan@gmail.com">mikorokuscan@gmail.com</a>.</p>
    </>,
  },
  privacy: {
    title: "Privacy Policy",
    children: <>
      <p>At <strong>Mikoroku</strong>, accessible from <strong>https://mikoroku.com</strong>, the privacy of our visitors is one of our main priorities.</p>
      <p>If you need more information, please contact us at <a href="mailto:mikorokuscan@gmail.com">mikorokuscan@gmail.com</a>.</p>
      <h2>Log Files</h2><p>Mikoroku uses log files. These include IP address, browser type, ISP, time stamp, referring pages, and clicks. This data is used for analytics and site improvement.</p>
      <h2>Cookies</h2><p>We use cookies to store visitor preferences and improve user experience.</p>
      <h2>Advertising Partners</h2><p>Third-party advertisers may use cookies, JavaScript, or web beacons.</p><ul><li>Google - <a href="https://policies.google.com/technologies/ads">https://policies.google.com/technologies/ads</a></li></ul>
      <h2>Third Party Privacy Policies</h2><p>Mikoroku’s Privacy Policy does not apply to other websites. Please review their respective policies.</p>
      <h2>Children’s Information</h2><p>We do not knowingly collect personal data from children under 13.</p>
      <h2>Consent</h2><p>By using our website, you agree to this Privacy Policy.</p>
    </>,
  },
  terms: {
    title: "Syarat dan Ketentuan",
    children: <>
      <h2>Terms of Service</h2><p>Dengan mengakses dan menggunakan Mikoroku, Anda dianggap telah membaca, memahami, dan menyetujui semua syarat dan ketentuan berikut.</p>
      <h3>1. Penggunaan Layanan</h3><ul><li>Website ini disediakan untuk tujuan hiburan dan informasi.</li><li>Pengguna setuju untuk tidak menggunakan situs ini untuk aktivitas ilegal atau melanggar hukum.</li></ul>
      <h3>2. Hak Cipta</h3><ul><li>Semua konten seperti manga, manhwa, dan manhua merupakan milik pemilik hak cipta masing-masing.</li><li>Mikoroku tidak menyimpan file secara langsung, melainkan menampilkan konten dari sumber pihak ketiga.</li><li>Jika Anda adalah pemilik hak cipta dan ingin konten dihapus, silakan hubungi kami di <a href="mailto:mikorokuscan@gmail.com">mikorokuscan@gmail.com</a>.</li></ul>
      <h3>3. Konten Dewasa</h3><ul><li>Beberapa konten mungkin mengandung unsur dewasa (18+).</li><li>Dengan mengakses situs ini, Anda menyatakan bahwa Anda berusia minimal 18 tahun atau sesuai hukum di wilayah Anda.</li></ul>
      <h3>4. Ketersediaan Layanan</h3><ul><li>Kami tidak menjamin bahwa website akan selalu tersedia tanpa gangguan.</li><li>Kami berhak mengubah atau menghentikan layanan kapan saja tanpa pemberitahuan.</li></ul>
      <h3>5. Tautan Pihak Ketiga</h3><ul><li>Situs ini dapat berisi link ke website lain.</li><li>Kami tidak bertanggung jawab atas isi atau kebijakan situs pihak ketiga tersebut.</li></ul>
      <h3>6. Batasan Tanggung Jawab</h3><ul><li>Semua konten disediakan “apa adanya” tanpa jaminan.</li><li>Mikoroku tidak bertanggung jawab atas kerugian akibat penggunaan situs ini.</li></ul>
      <h3>7. Perubahan Ketentuan</h3><ul><li>Kami berhak mengubah Terms kapan saja.</li><li>Pengguna disarankan memeriksa halaman ini secara berkala.</li></ul>
      <h3>8. Persetujuan</h3><p>Dengan menggunakan situs ini, Anda menyetujui semua ketentuan yang berlaku.</p>
    </>,
  },
  dmca: {
    title: "DMCA - Copyright Policy",
    children: <>
      <p><strong>Mikoroku Web Site Agreement</strong></p>
      <p>All manga featured on this website are the property of their publishers. The translation is made by a fan and is intended as a preview. If any file violates the copyright content, or if you want the file to be removed, please direct your complaint to the responsible party <a href="mailto:mikorokuscan@gmail.com">mikorokuscan@gmail.com</a></p>
      <p><strong>Postscript</strong></p>
      <ol><li>We respect the author by not damaging their work such as placing a watermark.</li><li>If a series we are working on is already official in our language, we will remove that series from our site.</li><li>The series that we translate do not intend for us to trade.</li></ol>
      <p className="legal-thanks">Terima kasih atas pengertian dan dukungan Anda.<br />Mikoroku Scan Team</p>
    </>,
  },
};

export default function LegalPage({ kind }: { kind: LegalKind }) {
  const page = content[kind];
  return <><SiteChrome showFooter={false} /><main className="legal-page"><article><h1>{page.title}</h1>{page.children}</article></main><SiteChrome showChrome={false} /></>;
}
