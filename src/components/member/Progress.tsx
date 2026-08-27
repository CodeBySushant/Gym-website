import { useEffect, useMemo, useRef, useState } from 'react';
import {
  TrendingDown, TrendingUp, Plus, Camera, Trash2, Ruler, Scale, ImageOff,
} from 'lucide-react';
import { toast } from 'sonner';
import { Measurement, ProgressPhoto } from '../../types';
import {
  fetchMeasurements, addMeasurement, fetchProgressPhotos,
  addProgressPhoto, deleteProgressPhoto, uploadMemberImage,
} from '../../memberApi';
import {
  Card, SectionHeader, Loading, EmptyState, Stat, Button, Modal,
  Field, inputClass, fmtDate,
} from './ui';
import { cn } from '../../lib/utils';

const BODY_FIELDS: { key: keyof Measurement; label: string; unit: string }[] = [
  { key: 'weight', label: 'Weight', unit: 'kg' },
  { key: 'chest', label: 'Chest', unit: 'cm' },
  { key: 'waist', label: 'Waist', unit: 'cm' },
  { key: 'hips', label: 'Hips', unit: 'cm' },
  { key: 'arms', label: 'Arms', unit: 'cm' },
  { key: 'thighs', label: 'Thighs', unit: 'cm' },
  { key: 'bodyFat', label: 'Body Fat', unit: '%' },
];

/** Lightweight inline SVG line chart — avoids pulling a charting library in. */
function WeightChart({ data }: { data: Measurement[] }) {
  const points = data.filter((d) => Number.isFinite(Number(d.weight)));
  if (points.length < 2) return null;

  const W = 640, H = 200, PAD = 28;
  const weights = points.map((p) => Number(p.weight));
  const min = Math.min(...weights), max = Math.max(...weights);
  const span = max - min || 1;

  const coords = points.map((p, i) => ({
    x: PAD + (i / (points.length - 1)) * (W - PAD * 2),
    y: PAD + (1 - (Number(p.weight) - min) / span) * (H - PAD * 2),
    m: p,
  }));

  const path = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
  const area = `${path} L${coords[coords.length - 1].x.toFixed(1)},${H - PAD} L${coords[0].x.toFixed(1)},${H - PAD} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Weight over time">
      <defs>
        <linearGradient id="wfill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FF003C" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#FF003C" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.5, 1].map((t) => (
        <line key={t} x1={PAD} x2={W - PAD} y1={PAD + t * (H - PAD * 2)} y2={PAD + t * (H - PAD * 2)}
          stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
      ))}
      <path d={area} fill="url(#wfill)" />
      <path d={path} fill="none" stroke="#FF003C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {coords.map((c, i) => (
        <circle key={i} cx={c.x} cy={c.y} r="4" fill="#0A0A0A" stroke="#FF003C" strokeWidth="2.5">
          <title>{`${c.m.weight}kg — ${fmtDate(c.m.date)}`}</title>
        </circle>
      ))}
      <text x={PAD} y={16} fill="rgba(255,255,255,0.35)" fontSize="11" fontWeight="700">{max.toFixed(1)}kg</text>
      <text x={PAD} y={H - 6} fill="rgba(255,255,255,0.35)" fontSize="11" fontWeight="700">{min.toFixed(1)}kg</text>
    </svg>
  );
}

export default function Progress() {
  const [measurements, setMeasurements] = useState<Measurement[] | null>(null);
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [logOpen, setLogOpen] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pending, setPending] = useState<{ url: string; angle: string; caption: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () => {
    fetchMeasurements().then(setMeasurements).catch(() => setMeasurements([]));
    fetchProgressPhotos().then(setPhotos).catch(() => setPhotos([]));
  };
  useEffect(load, []);

  // Server returns measurements oldest→newest; newest-first is handier for display.
  const newestFirst = useMemo(() => [...(measurements || [])].reverse(), [measurements]);
  const latest = newestFirst[0];
  const previous = newestFirst[1];
  const first = (measurements || [])[0];

  const totalChange = latest && first ? Number(latest.weight) - Number(first.weight) : null;
  const lastChange = latest && previous ? Number(latest.weight) - Number(previous.weight) : null;

  const saveMeasurement = async () => {
    if (!form.weight) { toast.error('Weight is required'); return; }
    setSaving(true);
    try {
      await addMeasurement(
        Object.fromEntries(
          Object.entries(form).filter(([, v]) => v !== '').map(([k, v]) => [k, Number(v)])
        ) as Partial<Measurement>
      );
      toast.success('Measurement saved');
      setLogOpen(false);
      setForm({});
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  const onFile = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadMemberImage(file);
      setPending({ url, angle: 'front', caption: '' });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const savePhoto = async () => {
    if (!pending) return;
    setSaving(true);
    try {
      await addProgressPhoto(pending.url, pending.angle, pending.caption);
      toast.success('Photo added');
      setPending(null);
      setPhotoOpen(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save photo');
    } finally {
      setSaving(false);
    }
  };

  const removePhoto = async (id: string) => {
    try {
      await deleteProgressPhoto(id);
      toast.success('Photo removed');
      setConfirmDelete(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not delete');
    }
  };

  if (measurements === null) return <Loading label="Loading your progress" />;

  return (
    <div>
      <SectionHeader
        title="Your"
        accent="Progress"
        subtitle="Measurements and photos over time"
        action={
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => setPhotoOpen(true)}>
              <Camera className="w-4 h-4" /> Add Photo
            </Button>
            <Button onClick={() => setLogOpen(true)}>
              <Plus className="w-4 h-4" /> Log Weight
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
        <Stat icon={Scale} label="Current Weight" value={latest ? `${latest.weight}kg` : '—'} sub={latest ? fmtDate(latest.date) : 'not logged'} tone="accent" />
        <Stat
          icon={(lastChange ?? 0) < 0 ? TrendingDown : TrendingUp}
          label="Since Last"
          value={lastChange !== null ? `${lastChange > 0 ? '+' : ''}${lastChange.toFixed(1)}kg` : '—'}
          sub="vs previous entry"
          tone={lastChange !== null ? (lastChange < 0 ? 'success' : 'default') : 'default'}
          delay={0.05}
        />
        <Stat
          icon={(totalChange ?? 0) < 0 ? TrendingDown : TrendingUp}
          label="Total Change"
          value={totalChange !== null ? `${totalChange > 0 ? '+' : ''}${totalChange.toFixed(1)}kg` : '—'}
          sub="since you started"
          tone={totalChange !== null ? (totalChange < 0 ? 'success' : 'default') : 'default'}
          delay={0.1}
        />
        <Stat icon={Ruler} label="Entries" value={measurements.length} sub="logged" delay={0.15} />
      </div>

      {/* Weight chart */}
      {measurements.length >= 2 && (
        <Card className="p-6 sm:p-8 mb-6">
          <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white/40 mb-6">Weight Trend</h3>
          <WeightChart data={measurements} />
        </Card>
      )}

      {/* Latest body measurements */}
      {latest && (
        <Card className="p-6 sm:p-8 mb-6">
          <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white/40 mb-6">
            Latest Measurements · {fmtDate(latest.date)}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
            {BODY_FIELDS.map(({ key, label, unit }) => {
              const val = latest[key] as number | undefined;
              const prev = previous?.[key] as number | undefined;
              const diff = typeof val === 'number' && typeof prev === 'number' ? val - prev : null;
              return (
                <div key={String(key)} className="bg-black/40 border border-white/5 rounded-2xl p-4">
                  <div className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-2">{label}</div>
                  <div className="text-lg font-black italic tabular-nums">
                    {typeof val === 'number' ? `${val}${unit}` : '—'}
                  </div>
                  {diff !== null && diff !== 0 && (
                    <div className={cn('text-[10px] font-bold mt-1 tabular-nums', diff < 0 ? 'text-emerald-400' : 'text-white/40')}>
                      {diff > 0 ? '+' : ''}{diff.toFixed(1)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {measurements.length === 0 && (
        <div className="mb-6">
          <EmptyState
            icon={Scale}
            title="No measurements yet"
            message="Log your weight to start tracking. Do it at the same time of day each week for numbers you can actually compare."
            action={<Button onClick={() => setLogOpen(true)}><Plus className="w-4 h-4" /> Log Your First Entry</Button>}
          />
        </div>
      )}

      {/* Photos */}
      <Card className="p-6 sm:p-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white/40">Progress Photos</h3>
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/25">
            {photos.length} {photos.length === 1 ? 'photo' : 'photos'}
          </span>
        </div>

        {photos.length === 0 ? (
          <div className="text-center py-12">
            <ImageOff className="w-9 h-9 text-white/15 mx-auto mb-4" />
            <p className="text-sm text-white/35 max-w-sm mx-auto leading-relaxed">
              Only you and the gym can see these. Same lighting, same spot, same time of day makes
              comparison far more useful.
            </p>
            <div className="mt-6">
              <Button variant="ghost" onClick={() => setPhotoOpen(true)}>
                <Camera className="w-4 h-4" /> Add Your First Photo
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {photos.map((p) => (
              <div key={p.id} className="group relative aspect-[3/4] rounded-2xl overflow-hidden bg-white/5 border border-white/10">
                <img src={p.url} alt={p.caption || `Progress photo, ${p.angle} view`} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <button
                  onClick={() => setConfirmDelete(p.id!)}
                  aria-label="Delete photo"
                  className="absolute top-3 right-3 bg-black/70 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <div className="text-[9px] font-black uppercase tracking-widest text-[#FF003C] mb-0.5">{p.angle}</div>
                  <div className="text-[11px] font-bold text-white/90">{fmtDate(p.date)}</div>
                  {p.caption && <div className="text-[10px] text-white/50 truncate mt-0.5">{p.caption}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Log measurement modal */}
      <Modal open={logOpen} onClose={() => setLogOpen(false)} title="Log Measurements">
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            {BODY_FIELDS.map(({ key, label, unit }) => (
              <Field key={String(key)} label={`${label} (${unit})`}>
                <input
                  type="number"
                  step="0.1"
                  inputMode="decimal"
                  className={inputClass}
                  value={form[String(key)] || ''}
                  onChange={(e) => setForm({ ...form, [String(key)]: e.target.value })}
                  placeholder={key === 'weight' ? 'Required' : 'Optional'}
                />
              </Field>
            ))}
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="ghost" onClick={() => setLogOpen(false)} className="flex-1">Cancel</Button>
            <Button onClick={saveMeasurement} disabled={saving} className="flex-1">
              {saving ? 'Saving…' : 'Save Entry'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add photo modal */}
      <Modal open={photoOpen} onClose={() => { setPhotoOpen(false); setPending(null); }} title="Add Progress Photo">
        <div className="space-y-5">
          {!pending ? (
            <label className="block bg-white/5 border-2 border-dashed border-white/15 rounded-2xl p-12 text-center cursor-pointer hover:border-[#FF003C] transition-colors">
              <Camera className="w-8 h-8 text-white/30 mx-auto mb-4" />
              <span className="block text-xs font-black uppercase tracking-[0.2em] text-white/50">
                {uploading ? 'Uploading…' : 'Choose a Photo'}
              </span>
              <span className="block text-[10px] text-white/25 mt-2">JPG or PNG, up to 10MB</span>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading}
                onChange={(e) => onFile(e.target.files?.[0])}
              />
            </label>
          ) : (
            <>
              <div className="aspect-[3/4] max-h-64 mx-auto rounded-2xl overflow-hidden bg-white/5">
                <img src={pending.url} alt="Preview" className="w-full h-full object-cover" />
              </div>
              <Field label="Angle">
                <div className="grid grid-cols-3 gap-2">
                  {(['front', 'side', 'back'] as const).map((a) => (
                    <button
                      key={a}
                      onClick={() => setPending({ ...pending, angle: a })}
                      className={cn(
                        'py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all',
                        pending.angle === a
                          ? 'bg-[#FF003C] border-[#FF003C] text-white'
                          : 'bg-black border-white/10 text-white/40 hover:border-white/25'
                      )}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Caption (optional)">
                <input
                  className={inputClass}
                  value={pending.caption}
                  maxLength={120}
                  onChange={(e) => setPending({ ...pending, caption: e.target.value })}
                  placeholder="e.g. Week 8"
                />
              </Field>
              <div className="flex gap-3">
                <Button variant="ghost" onClick={() => setPending(null)} className="flex-1">Choose Another</Button>
                <Button onClick={savePhoto} disabled={saving} className="flex-1">
                  {saving ? 'Saving…' : 'Save Photo'}
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Delete confirm */}
      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete Photo">
        <p className="text-sm text-white/50 mb-8 leading-relaxed">
          This permanently removes the photo from your progress gallery. It can&rsquo;t be undone.
        </p>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={() => setConfirmDelete(null)} className="flex-1">Cancel</Button>
          <Button variant="danger" onClick={() => confirmDelete && removePhoto(confirmDelete)} className="flex-1">
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
