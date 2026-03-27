import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, FileText, ChevronUp, ChevronDown, Plus } from 'lucide-react';

const FALLBACK_REASONS = ['สอนชดเชย', 'กิจกรรมพิเศษ', 'ซ่อมบำรุง', 'ประชุม', 'ทดสอบระบบ', 'อื่นๆ'];
const OTHER_PRESETS = ['เข้าเวร', 'ชุมนุมนักศึกษา', 'เตรียมงานคณะ', 'กรณีพิเศษอื่นๆ'];
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4556';

export default function ReasonPage({ roomCode, onSubmit, onCancel, loading }) {
    const [reasons, setReasons] = useState(FALLBACK_REASONS);
    const [loadingReasons, setLoadingReasons] = useState(true);
    const [selected, setSelected] = useState('');
    const [selectedOther, setSelectedOther] = useState('');
    
    // Time state (default to 2 hours from now)
    const [hours, setHours] = useState(new Date().getHours() + 2);
    const [minutes, setMinutes] = useState(0);
    const [roomSchedule, setRoomSchedule] = useState([]);

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
        
        // Normalize default hours
        if (hours >= 24) setHours(hours - 24);
    }, [roomCode]);

    const isOther = selected === 'อื่นๆ';
    const finalReason = isOther ? (selectedOther || 'เหตุผลอื่นๆ') : selected;

    const adjustTime = (h, m) => {
        let newH = hours + h;
        let newM = minutes + m;
        
        if (newM >= 60) { newM = 0; newH += 1; }
        if (newM < 0) { newM = 30; newH -= 1; }
        if (newH >= 24) newH = 0;
        if (newH < 0) newH = 23;
        
        setHours(newH);
        setMinutes(newM);
    };

    const setPresetDuration = (durationH) => {
        const now = new Date();
        now.setHours(now.getHours() + durationH);
        setHours(now.getHours());
        setMinutes(now.getMinutes() > 30 ? 30 : 0);
    };

    const getReturnByTime = () => {
        const d = new Date();
        d.setHours(hours, minutes, 0, 0);
        if (d <= new Date()) d.setDate(d.getDate() + 1);
        return d.toISOString();
    };

    const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

    const handleSubmit = () => {
        if (selected) {
            onSubmit(finalReason, getReturnByTime());
        }
    };

    return (
        <div className="page reason-page">
            <div className="reason-card glass">
                <div className="reason-header">
                    <FileText size={32} className="text-gradient" />
                    <h2 className="reason-title">ระบุเหตุผลการเบิกกุญแจ</h2>
                </div>
                
                <div className="reason-content-scroll">
                    {/* Schedule Overview */}
                    {roomSchedule.length > 0 && (
                        <div className="room-schedule-overview anim-fade-in">
                            <p className="reason-step-label"><Clock size={16} /> ตารางการใช้ห้องวันนี้</p>
                            <div className="schedule-list">
                                {roomSchedule.map(s => (
                                    <div key={s.id} className="schedule-item">
                                        <div className="schedule-time">{new Date(s.startTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} - {new Date(s.endTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</div>
                                        <div className="schedule-info">
                                            <div className="schedule-subject">{s.subjectName}</div>
                                            <div className="schedule-teacher">{s.teacherName}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step 1 */}
                    <p className="reason-step-label">1. เลือกเหตุผลการใช้งาน</p>
                    <div className="reason-options">
                        {reasons.map((r) => (
                            <button
                                key={r}
                                className={`reason-chip ${selected === r ? 'active' : ''}`}
                                onClick={() => setSelected(r)}
                            >
                                {r}
                            </button>
                        ))}
                    </div>

                    {isOther && (
                        <div className="reason-other-presets anim-fade-in">
                            <p className="reason-step-label">เหตุผลอื่นๆ (กดเลือกได้เลย)</p>
                            <div className="reason-options">
                                {OTHER_PRESETS.map((p) => (
                                    <button
                                        key={p}
                                        className={`reason-chip small ${selectedOther === p ? 'active' : ''}`}
                                        onClick={() => setSelectedOther(p)}
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step 2 */}
                    {selected && (
                        <div className="reason-time-section anim-fade-in">
                            <p className="reason-step-label">
                                <Clock size={16} /> 2. กำหนดเวลาที่จะคืนกุญแจ (ใช้นิ้วเลือกระเวลาได้เลย)
                            </p>
                            
                            <div className="touch-time-picker">
                                <div className="time-column">
                                    <button className="time-btn" onClick={() => adjustTime(1, 0)}><ChevronUp /></button>
                                    <div className="time-value">{hours.toString().padStart(2, '0')}</div>
                                    <button className="time-btn" onClick={() => adjustTime(-1, 0)}><ChevronDown /></button>
                                    <span className="time-label">ชั่วโมง</span>
                                </div>
                                <div className="time-separator">:</div>
                                <div className="time-column">
                                    <button className="time-btn" onClick={() => adjustTime(0, 30)}><ChevronUp /></button>
                                    <div className="time-value">{minutes.toString().padStart(2, '0')}</div>
                                    <button className="time-btn" onClick={() => adjustTime(0, -30)}><ChevronDown /></button>
                                    <span className="time-label">นาที</span>
                                </div>

                                <div className="time-presets">
                                    <button className="preset-btn" onClick={() => setPresetDuration(1)}>+1 ชม.</button>
                                    <button className="preset-btn" onClick={() => setPresetDuration(2)}>+2 ชม.</button>
                                    <button className="preset-btn" onClick={() => setPresetDuration(4)}>+4 ชม.</button>
                                </div>
                            </div>

                            <p className="reason-return-preview">
                                ⏰ ยืนยันเวลาคืนกุญแจ: <strong>{timeString} น.</strong>
                            </p>
                        </div>
                    )}
                </div>

                <div className="reason-actions">
                    <button
                        className="btn btn-primary btn-lg"
                        onClick={handleSubmit}
                        disabled={loading || !selected}
                    >
                        {loading ? 'กำลังส่งข้อมูล...' : <><CheckCircle size={20} /> ยืนยัน</>}
                    </button>
                    <button className="btn btn-secondary btn-lg" onClick={onCancel} disabled={loading}>
                        <XCircle size={20} /> ยกเลิก
                    </button>
                </div>
            </div>
        </div>
    );
}
