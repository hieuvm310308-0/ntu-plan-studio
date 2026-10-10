import {DEFAULT_MODEL,buildPlanContext,listGemmaModels,askGemma,previewProposal,fingerprint} from './ai.js';

export function mountChat({getState,metadata,getWeek,onApply,onInspect,notify}){
  const $=s=>document.querySelector(s),log=$('#chat-log');
  let key='',models=[],history=[],busy=false,controller,preview=null,requestState='',lastQuestion='',errorNode=null;
  function message(role,text){const node=document.createElement('div');node.className='chat-message '+role;const title=document.createElement('strong');title.textContent=role==='user'?'You':role==='error'?'Couldn’t finish':'Gemma';const body=document.createElement('p');body.textContent=text;node.append(title,body);log.append(node);log.scrollTop=log.scrollHeight;return node;}
  function refreshContext(){const state=getState(),active=state.plans.find(p=>p.id===state.active);$('#chat-context-label').textContent=`${active?.name||'Plan'} · ${active?.modules.length||0} modules · ${state.plans.length} plans in context`;if(preview&&fingerprint(state)!==preview.fingerprint){$('#chat-apply').disabled=true;$('#chat-proposal-status').textContent='Your plans changed. Ask again for an updated proposal.'}}
  function clearProposal(){preview=null;$('#chat-proposal').hidden=true;$('#chat-proposal-list').replaceChildren();}
  function setBusy(value){busy=value;$('#chat-send').disabled=value;$('#chat-input').disabled=value;$('#chat-connect').disabled=value;$('#chat-model').disabled=value;$('#chat-stop').hidden=!value;$('#chat-send').textContent=value?'Thinking…':'Send →';$('#chat-clear').disabled=value;}
  function showProposal(value){clearProposal();preview=value;$('#chat-proposal').hidden=false;$('#chat-proposal-title').textContent=`${value.label} · ${value.planName}`;for(const line of value.summary){const li=document.createElement('li');li.textContent=line;$('#chat-proposal-list').append(li)}$('#chat-proposal-status').textContent='Checked by the local scheduler. Review before applying.';$('#chat-apply').disabled=false;}
  async function connect(){if(busy)return;const entered=$('#chat-key').value.trim();if(!entered&&!key){$('#chat-connection-status').textContent='Enter a Google AI Studio key.';return}const proposedKey=entered||key;const c=new AbortController();controller=c;const timer=setTimeout(()=>c.abort(),30000);setBusy(true);$('#chat-connection-status').textContent='Checking available Gemma models…';try{models=await listGemmaModels(proposedKey,{signal:c.signal});key=proposedKey;$('#chat-key').value='';$('#chat-model').replaceChildren();for(const model of models){const option=document.createElement('option');option.value=model.id;option.textContent=model.label;$('#chat-model').append(option)}$('#chat-model').value=models.some(m=>m.id===DEFAULT_MODEL)?DEFAULT_MODEL:models[0].id;$('#chat-connection-status').textContent='Connected · Key held only in this page’s memory';$('#chat-disconnect').hidden=false;$('#chat-settings').hidden=true;notify('Gemma connected. Ask about your plan.')}catch(e){$('#chat-connection-status').textContent=e.name==='AbortError'?'Connection cancelled or timed out.':e.message;}finally{clearTimeout(timer);controller=null;setBusy(false)}}
  $('#chat-connect').onclick=connect;
  $('#chat-settings-button').onclick=()=>$('#chat-settings').hidden=!$('#chat-settings').hidden;
  $('#chat-disconnect').onclick=()=>{controller?.abort();key='';models=[];history=[];log.replaceChildren();clearProposal();$('#chat-key').value='';$('#chat-disconnect').hidden=true;$('#chat-connection-status').textContent='Disconnected · Enter your key to chat';$('#chat-settings').hidden=false;notify('Key forgotten and conversation cleared')};
  $('#chat-stop').onclick=()=>controller?.abort();
  $('#chat-clear').onclick=()=>{history=[];lastQuestion='';errorNode=null;log.replaceChildren();clearProposal();message('model','Conversation cleared. Your timetable is unchanged.');};
  $('#chat-inspect').onclick=()=>onInspect(buildPlanContext(getState(),metadata,getWeek(),$('#chat-input').value));
  $('#chat-apply').onclick=()=>{if(!preview)return;if(fingerprint(getState())!==preview.fingerprint){refreshContext();return}onApply(preview.state);clearProposal();message('model','Reviewed changes applied. I’ll use the updated plans in your next question.');notify('AI proposal applied')};
  $('#chat-dismiss').onclick=()=>clearProposal();
  async function send(){
    if(busy)return;const question=$('#chat-input').value.trim();if(!question)return;
    if(question.length>6000){notify('Keep your question under 6,000 characters.');return}
    if(!key){$('#chat-settings').hidden=false;$('#chat-key').focus();notify('Connect your Google AI Studio key first.');return}
    // Never retain a user's credential if it is accidentally pasted into the chat.
    if(question.includes(key)||/AIza[\w-]{20,}/.test(question)){notify('Enter API keys only in the key field.');return}
    clearProposal();errorNode?.remove();errorNode=null;lastQuestion=question;
    const state=structuredClone(getState());requestState=fingerprint(state);const context=buildPlanContext(state,metadata,getWeek(),question);
    message('user',question);$('#chat-input').value='';controller=new AbortController();const timer=setTimeout(()=>controller?.abort(),90000);setBusy(true);
    try{
      const model=$('#chat-model').value||DEFAULT_MODEL;
      const answer=await askGemma({key,model,context,history,message:question,signal:controller.signal,inputTokenLimit:models.find(m=>m.id===model)?.inputTokenLimit});
      message('model',answer.reply);history.push({role:'user',text:question},{role:'model',text:JSON.stringify({reply:answer.reply,proposal:answer.proposal})});history=history.slice(-12);
      if(fingerprint(getState())!==requestState){message('model','Your plans changed during this request. This reply describes the earlier snapshot. Ask again for current advice.');return}
      if(answer.proposal){try{showProposal(previewProposal(state,answer.proposal))}catch(error){message('error',error.message+' Nothing was applied.')}}
    }catch(error){errorNode=message('error',error.name==='AbortError'?'Request cancelled or timed out. No changes were applied.':error.message);const retry=document.createElement('button');retry.className='button small';retry.textContent='Retry question';retry.onclick=()=>{$('#chat-input').value=lastQuestion;send()};errorNode.append(retry);$('#chat-input').value=question;
    }finally{clearTimeout(timer);controller=null;setBusy(false);refreshContext()}
  }
  $('#chat-form').onsubmit=e=>{e.preventDefault();send()};
  $('#chat-input').onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}};
  document.querySelectorAll('[data-chat-prompt]').forEach(b=>b.onclick=()=>{$('#chat-input').value=b.dataset.chatPrompt;$('#chat-input').focus()});
  refreshContext();message('model','Tell me what you want your semester to look like. I can explain clashes, compare indexes and propose changes using your complete plans.');
  return {refreshContext};
}
