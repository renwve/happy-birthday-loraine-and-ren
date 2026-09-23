'use client';

import { useEffect, useMemo, useState } from 'react';
import { ATTENDEES } from '@/lib/attendees';

type Photo = { id:string; caption:string|null; driveFileId:string; driveUrl:string; createdAt:string; attendeeId:string; from:string|null; };

const PALETTE=['#36539a','#addae8','#c6a97c','#243e8b'];
function Star({fill}:{fill:string}){return <svg viewBox="0 0 100 100" aria-hidden="true"><path d="M50 4 L61 37 L96 37 L67 58 L78 92 L50 71 L22 92 L33 58 L4 37 L39 37 Z" fill={fill} stroke="#f4f2e0" strokeWidth="7" strokeLinejoin="round"/><path d="M50 4 L61 37 L96 37 L67 58 L78 92 L50 71 L22 92 L33 58 L4 37 L39 37 Z" fill="none" stroke="#243e8b" strokeWidth="1.6" strokeLinejoin="round"/></svg>}
function Heart({fill}:{fill:string}){return <svg viewBox="0 0 100 90" aria-hidden="true"><path d="M50 86 C10 58 2 34 16 18 C28 4 46 8 50 26 C54 8 72 4 84 18 C98 34 90 58 50 86 Z" fill={fill} stroke="#f4f2e0" strokeWidth="7" strokeLinejoin="round"/><path d="M50 86 C10 58 2 34 16 18 C28 4 46 8 50 26 C54 8 72 4 84 18 C98 34 90 58 50 86 Z" fill="none" stroke="#243e8b" strokeWidth="1.6" strokeLinejoin="round"/></svg>}
function Swirl({color}:{color:string}){return <svg viewBox="0 0 100 100" aria-hidden="true"><path d="M12 88 C4 58 16 24 46 14 C68 7 86 18 84 34 C82 47 68 53 58 47 C50 42 50 30 60 27" fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"/><path d="M12 88 C4 58 16 24 46 14 C68 7 86 18 84 34 C82 47 68 53 58 47 C50 42 50 30 60 27" fill="none" stroke="#f4f2e0" strokeWidth="4" strokeLinecap="round"/></svg>}
function Motif({kind,index}:{kind:'star'|'heart'|'swirl';index:number}){const c=PALETTE[index%PALETTE.length]; return kind==='star'?<Star fill={c}/>:kind==='heart'?<Heart fill={c}/>:<Swirl color={c}/>}

export default function BirthdayWall(){
  const [attendee,setAttendee]=useState<string|null>(null);
  const [photos,setPhotos]=useState<Photo[]>([]);
  const [open,setOpen]=useState(false);
  const [file,setFile]=useState<File|null>(null);
  const [preview,setPreview]=useState<string|null>(null);
  const [caption,setCaption]=useState('');
  const [message,setMessage]=useState('');
  const [busy,setBusy]=useState(false);
  const [toast,setToast]=useState('');

  const load=async()=>{try{const r=await fetch('/api/photos',{cache:'no-store'});const j=await r.json();if(r.ok){setAttendee(j.attendee);setPhotos(j.photos||[])}else setMessage(j.error||'Could not load the wall.')}catch{setMessage('The wall is not reachable right now.')}};
  useEffect(()=>{load(); const id=setInterval(load,5000); return()=>clearInterval(id)},[]);
  useEffect(()=>()=>{if(preview)URL.revokeObjectURL(preview)},[preview]);
  const mine=useMemo(()=>photos.filter(p=>p.from===attendee),[photos,attendee]);

  async function choose(name:string){
    const r=await fetch('/api/attendee/select',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name})});
    const j=await r.json(); if(!r.ok){setMessage(j.error||'Could not choose attendee.');return;} setAttendee(name); setMessage(''); await load();
  }
  function resetModal(){setOpen(false);setFile(null);setCaption('');setMessage('');if(preview)URL.revokeObjectURL(preview);setPreview(null)}
  function pick(f:File|null){if(!f)return;if(!f.type.startsWith('image/')){setMessage('That file is not a picture. Try a JPG or PNG.');return}setFile(f);setPreview(URL.createObjectURL(f));setMessage('')}
  async function upload(){if(!file)return;setBusy(true);setMessage('Putting it up…');try{const form=new FormData();form.append('file',file);form.append('caption',caption);const r=await fetch('/api/upload',{method:'POST',body:form});const j=await r.json();if(!r.ok)throw new Error(j.error||'Upload failed.');resetModal();setToast('it is up ♡');await load();setTimeout(()=>setToast(''),2500)}catch(e){setMessage(e instanceof Error?e.message:'That did not save. Try once more.')}finally{setBusy(false)}}
  async function remove(id:string){if(!confirm('Take this photo off the wall for everyone?'))return;const r=await fetch('/api/delete',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({id})});const j=await r.json();if(!r.ok){setToast(j.error||'Could not remove it');setTimeout(()=>setToast(''),2500);return}setToast('taken down');await load();setTimeout(()=>setToast(''),2500)}

  return <>
    {!attendee && <div className="attendee-veil"><div className="attendee-sheet"><span className="badge"><Motif kind="star" index={0}/> a whole wall just for them</span><h2>who are you?</h2><p>pick your little corner of the wall</p><div className="attendee-grid">{ATTENDEES.map((name)=><button key={name} className="attendee-button" onClick={()=>choose(name)}>{name}</button>)}</div></div></div>}
    <div className="sky"><div className="dotgrid"/><div className="stickerfield">
      {(['star','heart','swirl','star','heart','swirl'] as const).map((m,i)=><div key={i} className={`sticker s${i+1}`}><Motif kind={m} index={i}/></div>)}
      <div className="hero"><span className="badge"><Motif kind="star" index={0}/> a whole wall just for them</span><div className="hb-wrap"><svg className="hb-us" viewBox="0 0 300 200" aria-hidden="true"><path d="M40 170 C10 120 30 60 90 40 C150 20 210 30 250 70" fill="none" stroke="var(--tan)" strokeWidth="2.4" strokeDasharray="1 11" strokeLinecap="round"/></svg><h1 className="hb1 stitch">happy</h1><h1 className="hb2 stitch">birthday</h1></div><div className="to-names"><span className="to-tag">to the one and only</span><p className="names">Loraine <span className="amp">&amp;</span> Ren</p></div><div className="tape-row"><span className="tape">pin it up ↓</span><span className="tape">bring a picture, any picture</span><span className="tape">the goofier the better</span></div><div className="cta-zone"><button className="cta" onClick={()=>setOpen(true)} disabled={!attendee}>+ add a photo</button><span className="cta-note">{attendee?`you are ${attendee} · anyone can add`:'choose an attendee above'}</span></div></div>
    </div><div className="scallop-bottom"/></div>
    <main className="wall"><div className="wallhead"><h2 className="stitch">the wall</h2><svg className="squig" viewBox="0 0 160 20" aria-hidden="true"><path d="M2 10 Q20 0 38 10 T74 10 T110 10 T146 10" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></svg><p className="count">{photos.length===1?'1 photo so far':`${photos.length} photos so far`}</p></div><div className="masonry">{photos.length===0?<div className="empty"><span className="stitch">nothing up yet</span><p>Be the first one to pin a picture up.</p></div>:photos.map((p,i)=><figure className="card" key={p.id}><span className="pin"><Star fill="#addae8"/></span>{p.from===attendee&&<button className="del" onClick={()=>remove(p.id)}>remove</button>}<div className="frame"><img loading="lazy" src={`https://drive.google.com/thumbnail?id=${encodeURIComponent(p.driveFileId)}&sz=w1200`} alt={p.caption||'A photo on the wall'}/></div>{p.caption&&<figcaption className="cap">{p.caption}</figcaption>}{p.from&&<p className="by">{p.from}</p>}</figure>)}</div></main>
    <footer className="foot"><span className="foot-tape">made for loraine &amp; ren</span><p className="row2">keep the photos coming all week ♡</p></footer>
    {open&&<div className="veil" onClick={e=>{if(e.currentTarget===e.target)resetModal()}}><div className="sheet" role="dialog" aria-modal="true"><h3>add a photo</h3><p className="sub">it goes up for everyone</p><label className="drop"><b>choose a picture</b><small>{file?'picked — tap to swap':'JPG · PNG · GIF · WEBP'}</small><input type="file" accept="image/*" onChange={e=>pick(e.target.files?.[0]||null)}/></label>{preview&&<div className="preview" style={{display:'block'}}><img src={preview} alt="The photo you picked"/></div>}<label className="fld" htmlFor="cap">caption, if you want one</label><input id="cap" type="text" maxLength={90} value={caption} onChange={e=>setCaption(e.target.value)} placeholder="the night we lost the car keys"/><label className="fld">sign it</label><input type="text" readOnly value={attendee||''}/><div className="row"><button className="ghost" onClick={resetModal}>back</button><button className="solid" disabled={!file||busy} onClick={upload}>{busy?'putting it up…':'put it up'}</button></div><p className="msg">{message}</p></div></div>}
    <div className={`toast ${toast?'on':''}`}>{toast}</div>
  </>
}