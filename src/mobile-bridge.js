/* PWA mobile bridge. Uses pdf-lib in the browser; no Electron APIs. */
(() => {
  'use strict';
  const MAX_BYTES = 25 * 1024 * 1024;
  const MAX_FILES = 20;
  const MAX_PDF_PAGES = 100;
  const supportFiles = [];
  let signatureDataUrl = null;
  let signatureName = "";
  const signaturePicker = document.createElement("input");
  signaturePicker.type = "file"; signaturePicker.accept = "image/png,image/jpeg,.png,.jpg,.jpeg"; signaturePicker.hidden = true; document.body.appendChild(signaturePicker);
  const picker = document.createElement('input');
  picker.type = 'file';
  picker.accept = '.pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png';
  picker.multiple = true;
  picker.hidden = true;
  document.body.appendChild(picker);

  const clean = v => String(v ?? '').trim();
  const upper = v => clean(v).toLocaleUpperCase('es-CO');
  const fmtDate = v => {
    if (!v) return '';
    const [y,m,d] = v.split('-');
    return `${d}/${m}/${y}`;
  };
  const fmtTime = v => {
    if (!v) return '';
    const [hh,mm] = v.split(':').map(Number);
    const suffix = hh >= 12 ? 'p. m.' : 'a. m.';
    return `${String(hh % 12 || 12).padStart(2,'0')}:${String(mm).padStart(2,'0')} ${suffix}`;
  };
  const duration = d => {
    if (d.modalidad === 'POR HORAS') {
      const [h1,m1] = d.horaInicio.split(':').map(Number);
      const [h2,m2] = d.horaFin.split(':').map(Number);
      const mins = h2*60+m2-h1*60-m1;
      const h = Math.floor(mins/60), m = mins%60;
      return h && m ? `${h} h ${m} min` : h ? `${h} ${h===1?'hora':'horas'}` : `${m} min`;
    }
    const days = Array.isArray(d.fechasPermiso) ? d.fechasPermiso.length : 0;
    return `${days} ${days===1?'día':'días'} hábiles`;
  };
  const safeFilename = d => `SOLICITUD_PERMISO_${clean(d.documento).replace(/[^a-z0-9_-]/gi,'_')}_${d.fechaInicio}_${upper(d.nombre).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Z0-9_-]+/g,'_') || 'SOLICITANTE'}.pdf`;


  async function chooseSignature() {
    return new Promise(resolve => {
      signaturePicker.value = '';
      signaturePicker.onchange = async () => {
        const file = signaturePicker.files && signaturePicker.files[0];
        if (!file) { resolve(null); return; }
        try {
          if (!['image/png','image/jpeg'].includes(file.type) || file.size > 5 * 1024 * 1024) throw new Error('Seleccione una firma PNG o JPG de máximo 5 MB.');
          const url = await new Promise((res,rej) => { const reader=new FileReader(); reader.onload=()=>res(reader.result); reader.onerror=()=>rej(new Error('No se pudo leer la imagen de firma.')); reader.readAsDataURL(file); });
          const image = await new Promise((res,rej)=>{const img=new Image();img.onload=()=>res(img);img.onerror=()=>rej(new Error('La imagen de firma no es válida.'));img.src=url;});
          if (!image.width || !image.height || image.width > 10000 || image.height > 10000 || image.width*image.height > 40000000) throw new Error('Las dimensiones de la firma no son válidas.');
          const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d',{willReadFrequently:true}); canvas.width=image.width;canvas.height=image.height;ctx.drawImage(image,0,0);
          const pixels=ctx.getImageData(0,0,canvas.width,canvas.height),d=pixels.data;let minX=canvas.width,minY=canvas.height,maxX=-1,maxY=-1;
          for(let y=0;y<canvas.height;y+=1)for(let x=0;x<canvas.width;x+=1){const i=(y*canvas.width+x)*4,a=d[i+3],bright=d[i]>245&&d[i+1]>245&&d[i+2]>245;if(a>12&&!bright){if(x<minX)minX=x;if(x>maxX)maxX=x;if(y<minY)minY=y;if(y>maxY)maxY=y;}}
          if(maxX<minX||maxY<minY)throw new Error('La imagen no contiene trazos visibles de firma.');
          const pad=Math.max(2,Math.round(Math.max(maxX-minX+1,maxY-minY+1)*0.025));minX=Math.max(0,minX-pad);minY=Math.max(0,minY-pad);maxX=Math.min(canvas.width-1,maxX+pad);maxY=Math.min(canvas.height-1,maxY+pad);
          const out=document.createElement('canvas');out.width=maxX-minX+1;out.height=maxY-minY+1;out.getContext('2d').drawImage(canvas,minX,minY,out.width,out.height,0,0,out.width,out.height);
          signatureDataUrl=out.toDataURL('image/png');signatureName=file.name;resolve({name:file.name});
        } catch(e){alert(e.message);resolve(null);}
      };
      signaturePicker.click();
    });
  }
  function clearSignature(){signatureDataUrl=null;signatureName='';return true;}

  async function pickSupport() {
    return new Promise(resolve => {
      picker.value = '';
      picker.onchange = () => {
        const selected = [...(picker.files || [])];
        if (!selected.length) { resolve(null); return; }
        try {
          for (const f of selected) {
            const ext = f.name.toLowerCase().split('.').pop();
            if (!['pdf','jpg','jpeg','png'].includes(ext)) throw new Error('El soporte debe ser PDF, JPG, JPEG o PNG.');
            if (f.size > MAX_BYTES) throw new Error('Cada soporte debe tener un tamaño máximo de 25 MB.');
          }
          const merged = new Map(supportFiles.map(f => [f.name + ':' + f.size, f]));
          selected.forEach(f => merged.set(f.name + ':' + f.size, f));
          if (merged.size > MAX_FILES) throw new Error('Puede adjuntar hasta 20 soportes por solicitud.');
          supportFiles.splice(0, supportFiles.length, ...merged.values());
          resolve(supportFiles.map(f => ({name:f.name,size:f.size})));
        } catch (e) { alert(e.message); resolve(null); }
      };
      picker.click();
    });
  }

  function wrap(text, font, size, maxWidth) {
    const words = clean(text).split(/\s+/).filter(Boolean);
    if (!words.length) return ['—'];
    const lines=[]; let line='';
    for (const word of words) {
      const test=line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(test,size) <= maxWidth) line=test;
      else { if (line) lines.push(line); line=word; }
    }
    if (line) lines.push(line);
    return lines;
  }

  async function createPdf(data) {
    if (!window.PDFLib) throw new Error('No se pudo cargar el motor PDF. Conéctese a internet, recargue la aplicación y vuelva a intentar.');
    if (!document.getElementById('form').reportValidity()) throw new Error('Revise los campos obligatorios del formulario.');
    if (!data.nombre || !data.documento || !data.tipoPersonal || !data.cargo) throw new Error('Complete la identificación del solicitante.');
    if (!data.fechaSolicitud || !data.fechaInicio) throw new Error('Complete las fechas obligatorias.');
    const currentDay=(()=>{const n=new Date();return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`;})();
    if(data.fechaSolicitud!==currentDay)throw new Error('La fecha de solicitud debe corresponder únicamente al día de hoy.');
    const isWeekend=v=>[0,6].includes(new Date(`${v}T00:00:00Z`).getUTCDay());
    const easter=y=>{const a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),mo=Math.floor((h+l-7*m+114)/31),day=((h+l-7*m+114)%31)+1;return new Date(Date.UTC(y,mo-1,day));};
    const isHoliday=v=>{const y=+v.slice(0,4),fixed=[[1,1,false],[1,6,true],[3,19,true],[5,1,false],[6,29,true],[7,20,false],[8,7,false],[8,15,true],[10,12,true],[11,1,true],[11,11,true],[12,8,false],[12,25,false]],set=new Set(),iso=d=>d.toISOString().slice(0,10),monday=d=>{const x=new Date(d),w=x.getUTCDay();if(w!==1)x.setUTCDate(x.getUTCDate()+((8-w)%7));return x;};fixed.forEach(([m,d,move])=>{const x=new Date(Date.UTC(y,m-1,d));set.add(iso(move?monday(x):x));});const e=easter(y);[-3,-2].forEach(n=>{const x=new Date(e);x.setUTCDate(x.getUTCDate()+n);set.add(iso(x));});[39,60,68].forEach(n=>{const x=new Date(e);x.setUTCDate(x.getUTCDate()+n);set.add(iso(monday(x)));});return set.has(v);};
    const business=v=>!isWeekend(v)&&!isHoliday(v);
    if(data.modalidad==='POR DÍAS'){const dates=Array.isArray(data.fechasPermiso)?data.fechasPermiso:[];if(!dates.length)throw new Error('Seleccione al menos un día de permiso.');if(dates.length>3)throw new Error('No puede solicitar más de tres días hábiles, sean consecutivos o no.');if(new Set(dates).size!==dates.length)throw new Error('No repita una misma fecha.');for(const v of dates){if(v<currentDay)throw new Error('No se puede solicitar un permiso para una fecha que ya pasó.');if(!business(v))throw new Error(`${fmtDate(v)} corresponde a un fin de semana o festivo nacional.`);}}else{if(data.fechaInicio<currentDay)throw new Error('No se puede solicitar un permiso para una fecha que ya pasó.');if(!business(data.fechaInicio))throw new Error('No se pueden solicitar permisos por horas en fines de semana ni festivos nacionales.');}
    if (data.modalidad === 'POR HORAS' && (!data.horaInicio || !data.horaFin || data.horaFin <= data.horaInicio)) throw new Error('La hora final debe ser posterior a la hora inicial.');
    if (data.cargo === 'RECTOR' && !data.destinatario) throw new Error('Indique la autoridad jerárquica competente.');
    const { PDFDocument, StandardFonts, rgb } = window.PDFLib;
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const italic = await pdf.embedFont(StandardFonts.HelveticaOblique);
    const pageW=595.28, pageH=841.89, margin=48, contentW=pageW-margin*2;
    const colors={text:rgb(.12,.14,.17), label:rgb(.35,.38,.42), heading:rgb(.08,.20,.35), line:rgb(.72,.75,.79)};
    const headerBytes = await (await fetch('assets/encabezado-institucional.png')).arrayBuffer();
    const footerBytes = await (await fetch('assets/pie-institucional.png')).arrayBuffer();
    const header = await pdf.embedPng(headerBytes), footer = await pdf.embedPng(footerBytes);
    const footerH = contentW*footer.height/footer.width;
    const headerH = contentW*header.height/header.width;
    const startY=pageH-62-headerH, bottom=20+footerH+24;
    let page;
    let y;
    const addPage = () => {
      page=pdf.addPage([pageW,pageH]);
      page.drawImage(header,{x:margin,y:pageH-20-headerH,width:contentW,height:headerH});
      const title='SOLICITUD DE PERMISO', tw=bold.widthOfTextAtSize(title,12);
      page.drawText(title,{x:(pageW-tw)/2,y:pageH-38-headerH,size:12,font:bold,color:colors.text});
      page.drawLine({start:{x:margin,y:pageH-46-headerH},end:{x:pageW-margin,y:pageH-46-headerH},thickness:.7,color:colors.line});
      page.drawImage(footer,{x:margin,y:20,width:contentW,height:footerH});
      const credit='Desarrollado por Mg. César Avila';
      page.drawText(credit,{x:pageW-margin-italic.widthOfTextAtSize(credit,7.2),y:4.5,size:7.2,font:italic,color:rgb(.39,.43,.49)});
      y=startY;
    };
    const ensure = h => { if (y-h<bottom) addPage(); };
    const section = title => { ensure(34); y-=7; page.drawText(title,{x:margin,y,size:8.2,font:bold,color:colors.heading}); y-=10; };
    const drawWrapped = (text,x,top,width,size=7.5,lineH=9,face=font,color=colors.text) => {
      const lines=wrap(text,face,size,width);
      lines.forEach((line,i)=>page.drawText(line,{x,y:top-i*lineH,size,font:face,color}));
      return lines.length;
    };
    const row = (fields, opts={}) => {
      const gap=opts.gap ?? 10, aw=contentW-gap*(fields.length-1);
      const widths=opts.widths ? opts.widths.map(v=>aw*v/opts.widths.reduce((a,b)=>a+b,0)) : fields.map(()=>aw/fields.length);
      const size=opts.fontSize ?? 7.6, pad=5, lineH=opts.lineHeight ?? 9;
      const wrapped=fields.map((f,i)=>wrap(f.value || '—',font,size,widths[i]-pad*2));
      const max=Math.max(...wrapped.map(a=>a.length)), h=Math.max(opts.minHeight ?? 26,18+max*lineH);
      ensure(h+2); let x=margin;
      fields.forEach((f,i)=>{
        page.drawRectangle({x,y:y-h,width:widths[i],height:h,borderWidth:.45,borderColor:colors.line});
        page.drawText(upper(f.label),{x:x+pad,y:y-9,size:6.1,font:bold,color:colors.label});
        drawWrapped(f.value || '—',x+pad,y-18,widths[i]-pad*2,size,lineH);
        x+=widths[i]+gap;
      });
      y-=h+8;
    };
    const full = (label,value) => {
      if (!clean(value)) return;
      const lines=wrap(value,font,7.3,contentW-12), h=Math.max(25,18+lines.length*8.5);
      ensure(h+2);
      page.drawRectangle({x:margin,y:y-h,width:contentW,height:h,borderWidth:.45,borderColor:colors.line});
      page.drawText(upper(label),{x:margin+6,y:y-9,size:6.1,font:bold,color:colors.label});
      drawWrapped(value,margin+6,y-18,contentW-12,7.3,8.5);
      y-=h+8;
    };
    addPage();
    let sectionNo=1;
    section(`${sectionNo++}. IDENTIFICACIÓN DEL SOLICITANTE`);
    row([{label:'Nombre completo',value:upper(data.nombre)},{label:'Documento',value:data.documento},{label:'Tipo de personal',value:data.tipoPersonal}],{widths:[5.2,1.6,2.2],fontSize:7.5});
    row([{label:'Cargo',value:data.cargo},{label:'Sede(s)',value:data.sede},{label:'Jornada',value:data.jornada}]);
    if (data.nivel || data.gradoGrupo || data.area) row([{label:'Nivel',value:data.nivel},{label:'Grado y grupo',value:data.gradoGrupo},{label:'Área',value:data.area}]);
    section(`${sectionNo++}. DESTINATARIO INSTITUCIONAL`);
    const recipient=[data.cargo==='RECTOR'?'Autoridad jerárquica competente':data.tratamientoRector,data.cargo==='RECTOR'?data.destinatario:upper(data.rector),data.cargo==='RECTOR'?'Superior jerárquico':(data.cargoRectoria==='RECTORA'?'Rectora':'Rector')].filter(Boolean);
    const boxH=Math.max(31,10+recipient.length*9); ensure(boxH+2);
    page.drawRectangle({x:margin,y:y-boxH,width:contentW,height:boxH,borderWidth:.45,borderColor:colors.line});
    recipient.forEach((line,i)=>drawWrapped(line,margin+6,y-10-i*9,contentW-12,7.6,8.2));
    y-=boxH+8;
    section(`${sectionNo++}. INFORMACIÓN DEL PERMISO`);
    row([{label:'Fecha de solicitud',value:fmtDate(data.fechaSolicitud)},{label:'Modalidad',value:data.modalidad},{label:'Duración solicitada',value:duration(data)}]);
    if(data.modalidad==='POR DÍAS') row([{label:'Fechas solicitadas',value:(data.fechasPermiso||[]).sort().map(fmtDate).join(' · ')},{label:'Cantidad',value:duration(data)},{label:'Horario',value:'Jornada completa'}]);
    else row([{label:'Fecha del permiso',value:fmtDate(data.fechaInicio)},{label:'Hora de inicio',value:fmtTime(data.horaInicio)},{label:'Hora de finalización',value:fmtTime(data.horaFin)}]);
    row([{label:'Causa del permiso',value:data.causa},{label:'Situación específica',value:data.situacion || 'No aplica'}]);
    full('Justificación',data.justificacion || (data.causa==='Otra causa justificada'?'La persona solicitante tratará esta situación personalmente con Rectoría.':''));
    if(data.observaciones) full('Observaciones del solicitante',data.observaciones);
    if(data.modalidadAtencion || data.detallePlan) {
      section(`${sectionNo++}. PLAN DE ATENCIÓN A ESTUDIANTES`);
      row([{label:'Estrategia pedagógica',value:data.modalidadAtencion || 'No especificada'}],{minHeight:22});
      full('Actividades, grupos y materiales',data.detallePlan);
    }
    if(supportFiles.length) {
      section(`${sectionNo++}. DOCUMENTOS ANEXOS`);
      full('Archivos incorporados después del informe',supportFiles.map((f,i)=>`${i+1}. ${f.name}`).join(' | '));
    }
    const teacher=data.cargo==='DOCENTE DE AULA', signH=teacher?96:72, signTop=y-2;
    ensure((teacher?132:96)+12);
    section(`${sectionNo++}. ${teacher?'FIRMAS, VISTO BUENO Y DECISIÓN INSTITUCIONAL':'FIRMAS Y DECISIÓN INSTITUCIONAL'}`);
    const gap=14, sigW=(contentW-gap)/2, left=margin, right=margin+sigW+gap, top=y-2;
    page.drawRectangle({x:left,y:top-signH,width:sigW,height:signH,borderWidth:.55,borderColor:colors.line});
    page.drawText('SOLICITANTE',{x:left+7,y:top-11,size:6.2,font:bold,color:colors.label});
    
    if(signatureDataUrl){const raw=Uint8Array.from(atob(signatureDataUrl.split(',')[1]),c=>c.charCodeAt(0));const sig=await pdf.embedPng(raw);const maxW=Math.min(72,sigW-28),maxH=32,scale=Math.min(maxW/sig.width,maxH/sig.height),w=sig.width*scale,h=sig.height*scale;page.drawImage(sig,{x:left+(sigW-w)/2-20,y:top-33-h/2,width:w,height:h});}
    page.drawText(upper(data.nombre),{x:left+7,y:top-53,size:7.2,font:bold,color:colors.text});
    page.drawText(`C.C. ${data.documento} · ${data.cargo}`,{x:left+7,y:top-64,size:6.4,font,color:colors.text});
    if(teacher){page.drawText('Vo. Bo. de Coordinación',{x:left+7,y:top-79,size:6.2,font:bold,color:colors.label});page.drawLine({start:{x:left+7,y:top-91},end:{x:left+sigW-7,y:top-91},thickness:.65,color:colors.label});}
    page.drawRectangle({x:right,y:top-signH,width:sigW,height:signH,borderWidth:.55,borderColor:colors.line});
    page.drawText('DECISIÓN DE RECTORÍA',{x:right+7,y:top-11,size:6.2,font:bold,color:colors.label});
    page.drawRectangle({x:right+7,y:top-27,width:7,height:7,borderWidth:.65,borderColor:colors.label});
    page.drawText('Autorizado',{x:right+18,y:top-25,size:6.7,font,color:colors.text});
    page.drawRectangle({x:right+76,y:top-27,width:7,height:7,borderWidth:.65,borderColor:colors.label});
    page.drawText('No autorizado',{x:right+87,y:top-25,size:6.7,font,color:colors.text});
    page.drawText('Observaciones:',{x:right+7,y:top-41,size:6.2,font:bold,color:colors.label});
    page.drawLine({start:{x:right+7,y:top-51},end:{x:right+sigW-7,y:top-51},thickness:.45,color:colors.line});
    page.drawText('Fecha y firma de Rectoría',{x:right+7,y:top-(teacher?65:59),size:6.2,font,color:colors.text});
    y=top-signH-4;

    for (const f of supportFiles) {
      const bytes = new Uint8Array(await f.arrayBuffer());
      const ext=f.name.toLowerCase().split('.').pop();
      if(ext==='pdf') {
        const attach=await PDFDocument.load(bytes);
        if(attach.getPageCount()>MAX_PDF_PAGES) throw new Error(`El PDF ${f.name} supera el máximo de ${MAX_PDF_PAGES} páginas.`);
        const copied=await pdf.copyPages(attach,attach.getPageIndices());
        copied.forEach(p=>pdf.addPage(p));
      } else {
        let img;
        try { img=ext==='png'?await pdf.embedPng(bytes):await pdf.embedJpg(bytes); }
        catch { throw new Error(`No se pudo leer la imagen ${f.name}. Verifique que sea un JPG o PNG válido.`); }
        const p=pdf.addPage([pageW,pageH]);
        p.drawImage(footer,{x:margin,y:20,width:contentW,height:footerH});
        p.drawText('SOPORTE ADJUNTO',{x:margin,y:pageH-48,size:12,font:bold,color:colors.heading});
        p.drawText(f.name.slice(0,110),{x:margin,y:pageH-67,size:8.5,font,color:colors.label});
        p.drawLine({start:{x:margin,y:pageH-78},end:{x:pageW-margin,y:pageH-78},thickness:.7,color:colors.line});
        const padX=28, topReserved=92, bottomReserved=82, aw=pageW-padX*2, ah=pageH-topReserved-bottomReserved;
        const scale=Math.min(aw/img.width,ah/img.height);
        p.drawImage(img,{x:(pageW-img.width*scale)/2,y:bottomReserved+(ah-img.height*scale)/2,width:img.width*scale,height:img.height*scale});
        p.drawText('Desarrollado por Mg. César Avila',{x:pageW-margin-italic.widthOfTextAtSize('Desarrollado por Mg. César Avila',7.2),y:4.5,size:7.2,font:italic,color:rgb(.39,.43,.49)});
      }
    }
    const bytes=await pdf.save();
    const blob=new Blob([bytes],{type:'application/pdf'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=url; a.download=safeFilename(data); a.style.display='none'; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),60000);
    return {outputPath:'Descargas del navegador / archivo descargado',filename:safeFilename(data),pages:pdf.getPageCount()};
  }

  window.solicitudPermiso = Object.freeze({
    seleccionarSoporte: pickSupport,
    quitarSoporte: async () => { supportFiles.splice(0); picker.value=''; return true; },
    seleccionarFirma: chooseSignature,
    quitarFirma: clearSignature,
    generarPdf: createPdf
  });
})();
