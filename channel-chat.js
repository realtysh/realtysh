/* 현진부동산 채널톡: 공개 Plugin Key만 사용, Access Secret 사용 금지 */
(function(){
  var w=window;
  if(w.ChannelIO)return;
  var ch=function(){ch.c(arguments);};
  ch.q=[];ch.c=function(args){ch.q.push(args);};
  w.ChannelIO=ch;
  function load(){if(document.getElementById('hyunjin-channel-sdk'))return;
    var s=document.createElement('script');s.id='hyunjin-channel-sdk';s.async=true;
    s.src='https://cdn.channel.io/plugin/ch-plugin-web.js';
    document.head.appendChild(s);
  }
  if(document.readyState==='complete')load();else w.addEventListener('load',load,{once:true});
  ch('boot',{'pluginKey':'e87d2abb-a5aa-4546-aec0-9cd34c417709'});
})();
