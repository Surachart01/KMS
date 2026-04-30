import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, FileText, ChevronUp, ChevronDown } from 'lucide-react';

const FALLBACK_REASONS = ['สอนชดเชย', 'กิจกรรมพิเศษ', 'ซ่อมบำรุง', 'ประชุม', 'ทดสอบระบบ', 'อื่นๆ'];
const OTHER_PRESETS = ['เข้าเวร', 'ชุมนุมนักศึกษา', 'เตรียมงานคณะ', 'กรณีพิเศษอื่นๆ'];
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4556';

const ITEMS_PER_PAGE = 4;

/** คำนวณเวลาเริ่มต้น: ปัดนาทีขึ้นเป็น :00 หรือ :30 แล้วบวก 2 ชั่วโมง */
function getDefaultTime() {
    const now = new Date();
    // ปัดนาทีขึ้นไปครึ่งชั่วโมงถัดไป
    const roundedMs = Math.ceil(now.getTime() / (30 * 60 * 1000)) * (30 * 60 * 1000);
    // บวก 2 ชั่วโมง
    const target = new Date(roundedMs + 2 * 60 * 60 * 1000);
    return { hours: target.getHours(), minutes: target.getMinutes() };
}

export default function ReasonPage({ roomCode, onSubmit, onCancel, loading }) {
    const [reasons, setReasons] = useState(FALLBACK_REASONS);
    const [selected, setSelected] = useState('');
    const [selectedOther, setSelectedOther] = useState('');
    const [reasonScrollIndex, setReasonScrollIndex] = useState(0);
    const [roomSchedule, setRoomSchedule] = useState([]);

    // Time state — เริ่มต้นถูกต้องตั้งแต่ต้น
    const defaultTime = getDefaultTime();
    const [hours, setHours] = useState(defaultTime.hours);
    const [minutes, setMinutes] = useState(defaultTime.minutes);

    useEffect(() => {
        const fetchReasons = async () => {
            try {
                const res = await fetch(`${API_URL}/api/borrow-reasons?isActive=true`);
                const json = await res.json();
                if (json.success && json.data?.length > 0) {
                    setReasons(json.data.map((r) => r.label));
                }
            } catch (err) { console.error('Reasons fetch error:', err); }
        };

        const fetchSchedule = async () => {
            try {
                const res = await fetch(`${API_URL}/api/kiosk/room-schedule/${roomCode}`);
                const json = await res.json();
                if (json.success) setRoomSchedule(json.data);
            } catch (err) { console.error('Schedule fetch error:', err); }
        };

        fetchReasons();
        fetchSchedule();
    }, [roomCode]);

    const isOther = selected === 'อื่นๆ';
    const finalReason = isOther ? (selectedOther || 'เหตุผลอื่นๆ') : selected;

    const adjustTime = (h, m) => {
        let newH = hours + h;
        let newM = minutes + m;

        if (newM >= 60) { newM = 0; newH += 1; }
        if (newM < 0)   { newM = 30; newH -= 1; }
        if (newH >= 24) newH = 0;
        if (newH < 0)   newH = 23;

        // เปรียบเทียบแบบ total minutes ป้องกัน edge case วินาที
        const now = new Date();
        const nowTotalM = now.getHours() * 60 + now.getMinutes();
        const newTotalM  = newH * 60 + newM;
        if (newTotalM <= nowTotalM) return;

        setHours(newH);
        setMinutes(newM);
    };

    const setPresetDuration = (durationH) => {
        // ใช้ timestamp เพื่อป้องกัน midnight wrap
        const now = new Date();
        const roundedMs = Math.ceil(now.getTime() / (30 * 60 * 1000)) * (30 * 60 * 1000);
        const target = new Date(roundedMs + durationH * 60 * 60 * 1000);
        setHours(target.getHours());
        setMinutes(target.getMinutes());
    };

    const getReturnByTime = () => {
        const now = new Date();
        // สร้าง target datetime สำหรับวันนี้ตามเวลาที่เลือก
        const target = new Date(now);
        target.setHours(hours, minutes, 0, 0);

        // ถ้าเวลาที่เลือก (total minutes) น้อยกว่าหรือเท่ากับตอนนี้ → ข้ามวัน
        const nowTotalM  = now.getHours() * 60 + now.getMinutes();
        const selTotalM  = hours * 60 + minutes;
        if (selTotalM <= nowTotalM) target.setDate(target.getDate() + 1);

        // Sanity check: ต้องอยู่ในอนาคต ห่างจากตอนนี้ไม่เกิน 24 ชั่วโมง
        const diffH = (target.getTime() - now.getTime()) / (1000 * 60 * 60);
        if (diffH <= 0 || diffH > 24) {
            // fallback: ตอนนี้ + 2 ชั่วโมง
            return new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();
        }

        return target.toISOString();
    };

    const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

    const handleSubmit = () => {
        if (selected) onSubmit(finalReason, getReturnByTime());
    };

    const canScrollUp   = reasonScrollIndex > 0;
    const canScrollDown = reasonScrollIndex + ITEMS_PER_PAGE < reasons.length;

    return (
        <div className="page reason-page">
            <div className="reason-card glass">

                {/* ── Header ── */}
                <div className="reason-header">
                    <FileText size={24} className="text-gradient" />
                    <h2 className="reason-title">ระบุเหตุผลการเบิกกุญแจ</h2>
                </div>

                {/* ── Body: 2 panels ── */}
                <div className="reason-body">

                    {/* ═══ LEFT PANEL — เลือกเหตุผล ═══ */}
                    <div className="reason-panel reason-panel--left">
                        <p className="reason-step-label">1. เลือกเหตุผล</p>

                        {/* ── Scroll area (fixed, no overflow) ── */}
                        <div className="reason-scroll-area">
                            {/* Scroll Up */}
                            <button
                                className="reason-nav-btn"
                                onClick={() => setReasonScrollIndex(i => Math.max(0, i - 1))}
                                disabled={!canScrollUp}
                            >
                                <ChevronUp size={22} />
                            </button>

                            {/* Reason list — fixed 4 items */}
                            <div className="reason-list">
                                {reasons
                                    .slice(reasonScrollIndex, reasonScrollIndex + ITEMS_PER_PAGE)
                                    .map((r) => (
                                        <button
                                            key={r}
                                            className={`reason-row-btn ${selected === r ? 'active' : ''}`}
                                            onClick={() => { setSelected(r); setSelectedOther(''); }}
                                        >
                                            {r}
                                        </button>
                                    ))}
                            </div>

                            {/* Scroll Down */}
                            <button
                                className="reason-nav-btn"
                                onClick={() => setReasonScrollIndex(i => Math.min(reasons.length - ITEMS_PER_PAGE, i + 1))}
                                disabled={!canScrollDown}
                            >
                                <ChevronDown size={22} />
                            </button>

                        </div>

                        {/* Other presets — แสดงด้านล่าง scroll area */}
                        {isOther && (
                            <div className="reason-other-presets anim-fade-in">
                                <p className="reason-step-label" style={{margin: '8px 0 4px'}}>เหตุผลอื่นๆ</p>
                                <div className="reason-other-grid">
                                    {OTHER_PRESETS.map((p) => (
                                        <button
                                            key={p}
                                            className={`reason-other-btn ${selectedOther === p ? 'active' : ''}`}
                                            onClick={() => setSelectedOther(p)}
                                        >
                                            {p}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ── Divider ── */}
                    <div className="reason-divider" />

                    {/* ═══ RIGHT PANEL — ตั้งเวลาคืน ═══ */}
                    <div className="reason-panel reason-panel--right">
                        <p className="reason-step-label"><Clock size={14} /> 2. กำหนดเวลาคืน</p>

                        {/* Time picker */}
                        <div className="time-picker-block">
                            {/* Hours */}
                            <div className="time-col">
                                <button className="time-nav-btn" onClick={() => adjustTime(1, 0)}><ChevronUp size={20} /></button>
                                <div className="time-digit">{hours.toString().padStart(2, '0')}</div>
                                <button className="time-nav-btn" onClick={() => adjustTime(-1, 0)}><ChevronDown size={20} /></button>
                                <span className="time-unit">ชั่วโมง</span>
                            </div>

                            <div className="time-colon">:</div>

                            {/* Minutes */}
                            <div className="time-col">
                                <button className="time-nav-btn" onClick={() => adjustTime(0, 30)}><ChevronUp size={20} /></button>
                                <div className="time-digit">{minutes.toString().padStart(2, '0')}</div>
                                <button className="time-nav-btn" onClick={() => adjustTime(0, -30)}><ChevronDown size={20} /></button>
                                <span className="time-unit">นาที</span>
                            </div>
                        </div>

                        {/* Presets */}
                        <div className="time-preset-row">
                            <button className="preset-chip" onClick={() => setPresetDuration(1)}>+1 ชม.</button>
                            <button className="preset-chip" onClick={() => setPresetDuration(2)}>+2 ชม.</button>
                            <button className="preset-chip" onClick={() => setPresetDuration(4)}>+4 ชม.</button>
                        </div>

                        {/* Preview */}
                        <div className="time-preview-box">
                            <span className="time-preview-label">คืนกุญแจ</span>
                            <span className="time-preview-value">{timeString} น.</span>
                        </div>

                        {/* Schedule (ถ้ามี) */}
                        {roomSchedule.length > 0 && (
                            <div className="schedule-mini">
                                <p className="reason-step-label" style={{marginBottom:'4px'}}><Clock size={12}/> ตารางห้องวันนี้</p>
                                {roomSchedule.slice(0, 2).map(s => {
                                    const fmt = (date) => {
                                        const d = new Date(date);
                                        const bkk = new Date(d.getTime() + 7 * 3600000);
                                        return `${String(bkk.getUTCHours()).padStart(2,'0')}.${String(bkk.getUTCMinutes()).padStart(2,'0')}`;
                                    };
                                    return (
                                        <div key={s.id} className="schedule-item-mini">
                                            <span className="schedule-time-mini">{fmt(s.startTime)}–{fmt(s.endTime)}</span>
                                            <span className="schedule-subj-mini">{s.subjectName}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Actions ── */}
                <div className="reason-actions">
                    <button
                        className="btn btn-primary btn-lg"
                        onClick={handleSubmit}
                        disabled={loading || !selected || (isOther && !selectedOther)}
                    >
                        {loading ? 'กำลังส่งข้อมูล...' : <><CheckCircle size={18} /> ยืนยัน</>}
                    </button>
                    <button className="btn btn-secondary btn-lg" onClick={onCancel} disabled={loading}>
                        <XCircle size={18} /> ยกเลิก
                    </button>
                </div>
            </div>
        </div>
    );
}
