export type ReaderServerNoticeConfig = {
  enabled: boolean;
  code: string;
};

export const DEFAULT_READER_SERVER_NOTICE: ReaderServerNoticeConfig = {
  enabled: true,
  code: `<style>
  .reader-notice { padding: 16px; border: 1px solid #e6c55a; border-radius: 14px; background: #fff9df; color: #262626; font: 14px/1.5 system-ui, sans-serif; }
  .reader-notice h2 { margin: 0 0 14px; color: #8a6710; font-size: 18px; }
  .reader-notice section + section { margin-top: 12px; }
  .reader-notice h3 { margin: 0 0 4px; font-size: 14px; }
  .reader-notice p { margin: 0; }
  @media (prefers-color-scheme: dark) {
    .reader-notice { border-color: #51451e; background: #20202a; color: #eee; }
    .reader-notice h2 { color: #ffd700; }
  }
</style>
<div class="reader-notice">
  <h2>PERHATIAN</h2>
  <section><h3>Server 1</h3><p>Server utama untuk membaca chapter. (Rekomendasi)</p></section>
  <section><h3>Server 2</h3><p>Server alternatif jika chapter di Server 1 mengalami masalah atau tidak dapat dimuat.</p></section>
  <section><h3>Emergency Server</h3><p>Server cadangan. Sebagian chapter belum lengkap. Jika gambar tidak muncul, artinya server sedang terkena limit dan gambar tidak dapat dimuat sementara. (Busuk)</p></section>
</div>`,
};

export function normalizeReaderServerNoticeConfig(value: unknown): ReaderServerNoticeConfig {
  if (!value || typeof value !== "object") return DEFAULT_READER_SERVER_NOTICE;
  const record = value as Record<string, unknown>;

  return {
    enabled: typeof record.enabled === "boolean"
      ? record.enabled
      : DEFAULT_READER_SERVER_NOTICE.enabled,
    code: typeof record.code === "string"
      ? record.code
      : DEFAULT_READER_SERVER_NOTICE.code,
  };
}
