import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronRight,
  ChevronLeft,
  Send,
  MessageSquare,
  Sparkles,
  Phone,
  Store,
  User,
  CheckCheck,
  Truck
} from 'lucide-react';
import { Listing, ChatMessage, UserAccount } from '../../types';

interface ChatModalProps {
  listing: Listing;
  currentUser: UserAccount | null;
  onClose: () => void;
  lang?: 'ar' | 'en';
}

export const ChatModal: React.FC<ChatModalProps> = ({
  listing,
  currentUser,
  onClose,
  lang = 'ar'
}) => {
  const isAr = lang === 'ar';
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [inputVal, setInputVal] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-1',
      senderId: 'seller',
      senderName: listing.sellerType === 'commercial' ? (listing.storeName || 'المتجر') : listing.sellerName,
      text: isAr
        ? `أهلاً بك في سوق بلحظة! يسعدني الرد على استفسارك بخصوص "${listing.title}" في الموصل.`
        : `Welcome! Happy to answer inquiries about "${listing.title}".`,
      timestamp: '10:00 ص',
      isMe: false
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const quickPrompts = isAr
    ? [
        'السلام عليكم، هل السلعة متوفرة؟',
        'هل متوفر توصيل لموقعي بالموصل؟',
        'ممكن السعر النهائي بلا زحمة؟',
        'أين موقع المعاينة بالتحديد؟'
      ]
    : [
        'Is this still available?',
        'Is delivery available in Mosul?',
        'What is your final price?',
        'Where can I inspect it?'
      ];

  const handleSend = (textToSend?: string) => {
    const text = (textToSend || inputVal).trim();
    if (!text) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      senderId: currentUser?.id || 'me',
      senderName: currentUser?.name || (isAr ? 'أنا' : 'Me'),
      text,
      timestamp: new Date().toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' }),
      isMe: true
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputVal('');

    // Simulated Seller Auto-reply after brief delay
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      let reply = '';
      if (text.includes('توصيل') || text.includes('delivery')) {
        reply = listing.deliveryAvailable
          ? isAr
            ? `نعم أخي، متوفر توصيل لجميع أحياء الموصل (${listing.deliveryNotes || 'خلال ساعات'}).`
            : 'Yes, delivery is available across Mosul.'
          : isAr
          ? `حالياً استلام مباشر من موقعنا في الموصل (${listing.district}). نتشرف بزيارتك.`
          : 'Direct pickup only from our location in Mosul.';
      } else if (text.includes('سعر') || text.includes('نهائي') || text.includes('price')) {
        reply = isAr
          ? 'السعر مناسب ومخفض جداً، ولكن نراعيك بشيء بسيط عند المعاينة والجدية.'
          : 'The price is very fair, but there is slight room for serious buyers.';
      } else if (text.includes('موقع') || text.includes('معاينة') || text.includes('مكان')) {
        reply = isAr
          ? `الموقع: الموصل - ${listing.district} (${listing.storeLocation?.addressName || 'قرب الشارع الرئيسي'}). نتشرف بيك.`
          : `Location: Mosul - ${listing.district}. You are welcome anytime!`;
      } else {
        reply = isAr
          ? 'أهلاً بك أخي الكريم! السلعة جاهزة ونظيفة وبإمكانك التواصل معي أو القدوم للمعاينة بأي وقت.'
          : 'Hello! The item is ready and you are welcome to inspect it anytime.';
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `msg-reply-${Date.now()}`,
          senderId: 'seller',
          senderName: listing.sellerType === 'commercial' ? (listing.storeName || 'المتجر') : listing.sellerName,
          text: reply,
          timestamp: new Date().toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' }),
          isMe: false
        }
      ]);
    }, 1100);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end sm:justify-center p-0 sm:p-3 select-none text-xs">
      <div className="bg-slate-50 w-full max-w-md mx-auto sm:rounded-3xl rounded-t-3xl h-[88vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-3.5 py-2.5 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="p-1 -mx-1 rounded-lg text-slate-700 hover:bg-slate-100 min-w-[36px] min-h-[36px] flex items-center justify-center transition-colors"
            >
              {isAr ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>

            <img
              src={listing.mediaUrls[0]}
              alt={listing.title}
              referrerPolicy="no-referrer"
              className="w-8 h-8 rounded-xl object-cover border border-slate-200"
            />

            <div>
              <h3 className="text-xs font-bold text-slate-900 truncate max-w-[160px]">
                {listing.sellerType === 'commercial' ? listing.storeName : listing.sellerName}
              </h3>
              <p className="text-[10px] text-emerald-700 font-medium truncate max-w-[160px]">
                {listing.district} · الموصل
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs font-black font-mono text-emerald-800 tabular-nums">
              {listing.hidePrice ? 'عند التواصل' : `${listing.price.toLocaleString()} ${listing.currency}`}
            </span>
          </div>
        </div>

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {/* Reference Card */}
          <div className="p-2 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center gap-2.5">
            <img
              src={listing.mediaUrls[0]}
              alt={listing.title}
              referrerPolicy="no-referrer"
              className="w-10 h-10 rounded-xl object-cover"
            />
            <div className="flex-1 min-w-0 text-xs">
              <span className="font-bold text-slate-900 truncate block">
                {listing.title}
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-emerald-700 font-mono font-bold">
                  {listing.hidePrice ? 'السعر عند التواصل' : `${listing.price.toLocaleString()} ${listing.currency}`}
                </span>
                <span className="text-[9px] text-slate-500 flex items-center gap-0.5">
                  <Truck className="w-2.5 h-2.5 text-emerald-600" />
                  {listing.deliveryAvailable ? 'متوفر توصيل' : 'استلام فقط'}
                </span>
              </div>
            </div>
          </div>

          {/* Chat Bubbles */}
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col ${m.isMe ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] px-3 py-2 rounded-2xl text-xs leading-relaxed ${
                  m.isMe
                    ? 'bg-emerald-600 text-white rounded-br-xs'
                    : 'bg-white text-slate-900 border border-slate-200 rounded-bl-xs shadow-2xs'
                }`}
              >
                <p>{m.text}</p>
                <div
                  className={`flex items-center justify-end gap-1 text-[9px] mt-0.5 ${
                    m.isMe ? 'text-emerald-100' : 'text-slate-400'
                  }`}
                >
                  <span>{m.timestamp}</span>
                  {m.isMe && <CheckCheck className="w-3 h-3 text-emerald-200" />}
                </div>
              </div>
            </div>
          ))}

          {/* Typing */}
          {isTyping && (
            <div className="flex items-center gap-1 p-2 bg-white rounded-xl border border-slate-200 w-16 text-slate-400">
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestions */}
        <div className="px-2.5 py-1.5 bg-white border-t border-slate-200 overflow-x-auto no-scrollbar flex items-center gap-1.5">
          {quickPrompts.map((q, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSend(q)}
              className="text-[10px] text-slate-700 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 px-2.5 py-0.5 rounded-full border border-slate-200 transition-colors whitespace-nowrap shrink-0"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="p-2.5 bg-white border-t border-slate-200 flex items-center gap-1.5">
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={isAr ? 'اكتب رسالتك للبائع هنا...' : 'Type message...'}
            className="flex-1 h-9 px-3 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
          />

          <button
            type="button"
            onClick={() => handleSend()}
            disabled={!inputVal.trim()}
            className="w-9 h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 active:scale-95 text-white flex items-center justify-center transition-all shrink-0"
          >
            <Send className="w-3.5 h-3.5 rtl:rotate-180" />
          </button>
        </div>
      </div>
    </div>
  );
};
