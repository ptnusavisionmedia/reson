import type { DeviceLite } from '@/lib/data/post-detail';
import { OWNERSHIP, parseStoredReview, parseStoredShowcase } from '@shared/validation/postDetails';

const CATEGORY: Record<string, string> = { iem: 'IEM', earbuds: 'Earbuds', headphone: 'Headphone', dac_amp: 'DAC / Amp', dap: 'DAP' };

/** ID perangkat yang dirujuk review/showcase, untuk diambil sekali oleh halaman. */
export function deviceIdsOf(type: string, details: unknown): string[] {
  if (type === 'review') {
    const r = parseStoredReview(details);
    return r ? [r.deviceId, ...r.companionDeviceIds] : [];
  }
  if (type === 'showcase') return parseStoredShowcase(details)?.components.flatMap((c) => (c.deviceId ? [c.deviceId] : [])) ?? [];
  return [];
}

function Device({ device }: { device: DeviceLite | undefined }) {
  if (!device) return <p className="text-sm text-muted">Perangkat tidak tersedia di katalog.</p>;
  return (
    <div className="rounded-lg border border-line bg-surface p-3">
      <p className="font-semibold">{device.name}</p>
      <p className="text-sm text-muted">
        {device.brand} • {CATEGORY[device.category] ?? device.category}
      </p>
    </div>
  );
}

function Section({ title, text }: { title: string; text: string | null }) {
  if (!text) return null;
  return (
    <div>
      <h3 className="text-sm font-semibold text-muted">{title}</h3>
      <p className="whitespace-pre-wrap">{text}</p>
    </div>
  );
}

function Bullets({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div>
      <h3 className="text-sm font-semibold text-muted">{title}</h3>
      <ul className="list-disc pl-5">
        {items.map((x, i) => (
          <li key={i}>{x}</li>
        ))}
      </ul>
    </div>
  );
}

/** Isi terstruktur review/showcase. Review dan showcase berbagi ID post, like, dan komentar dengan post biasa. */
export function PostDetailsView({ type, details, devices }: { type: 'review' | 'showcase'; details: unknown; devices: Record<string, DeviceLite> }) {
  const review = type === 'review' ? parseStoredReview(details) : null;
  const showcase = type === 'showcase' ? parseStoredShowcase(details) : null;

  if (review) {
    const ownership = OWNERSHIP.find((o) => o.id === review.ownership)?.label ?? review.ownership;
    return (
      <div className="flex flex-col gap-4">
        <Device device={devices[review.deviceId]} />
        <p className="w-fit rounded-md border border-line px-2 py-0.5 text-xs text-muted">Status: {ownership}</p>
        {review.ownership === 'sponsored' && (
          <p className="text-sm text-muted">Unit ini sponsor/gratis dari pihak lain. Pertimbangkan hal itu saat membaca.</p>
        )}
        <p className="text-sm text-muted">Kesan suara bersifat subjektif dan belum tentu sama di telinga lain.</p>
        <Section title="Bass" text={review.bassNotes} />
        <Section title="Vokal" text={review.vocalNotes} />
        <Section title="Treble" text={review.trebleNotes} />
        <Section title="Kenyamanan" text={review.comfortNotes} />
        <Bullets title="Kelebihan" items={review.pros} />
        <Bullets title="Kekurangan" items={review.cons} />
        {review.companionDeviceIds.length > 0 && (
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-muted">Perangkat pendamping</h3>
            {review.companionDeviceIds.map((id) => (
              <Device key={id} device={devices[id]} />
            ))}
          </div>
        )}
        {review.referenceTracks.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-muted">Lagu referensi</h3>
            <ul className="flex flex-col">
              {review.referenceTracks.map((t, i) => (
                <li key={i}>
                  {t.url ? (
                    <a href={t.url} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex min-h-11 items-center text-accent">
                      ♪ {t.title} (buka tautan)
                    </a>
                  ) : (
                    <span>♪ {t.title}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  if (showcase) {
    return (
      <div className="flex flex-col gap-4">
        <Section title="Tujuan" text={showcase.purpose} />
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-muted">Komponen</h3>
          {showcase.components.map((c, i) => (
            <div key={i} className="flex flex-col gap-1">
              <p>
                {i + 1}. {c.label}
              </p>
              {c.deviceId ? <Device device={devices[c.deviceId]} /> : <p className="text-sm text-muted">Item bebas, belum diverifikasi.</p>}
            </div>
          ))}
        </div>
        <Section title="Kesan pemilik" text={showcase.impressions} />
      </div>
    );
  }
  return null;
}
