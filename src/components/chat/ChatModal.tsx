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

  const previewImg = listing.thumbnailUrl || listing.mediaUrls?.[0] || listing.fullImageUrl;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-xs flex flex-col justify-end sm:justify-center p-0 sm:p-4 select-none text-xs animate-fade-in">
      <div className="bg-[#FDFBF7] w-full max-w-md mx-auto sm:rounded-3xl rounded-t-3xl h-[88vh] flex flex-col overflow-hidden shadow-2xl border border-amber-200/80 animate-modal-up">
        {/* Header */}
        <div className="bg-[#FFFDF9] border-b border-amber-200/70 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={onClose}
              className="group min-w-[40px] min-h-[40px] -mx-1 rounded-xl text-[#1E293B] hover:bg-[#FEF9E7] active:scale-95 flex items-center justify-center transition-all shrink-0"
              aria-label={isAr ? 'رجوع' : 'Back'}
            >
              {isAr ? (
                <ChevronRight className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-0.5" />
              ) : (
                <ChevronLeft className="w-5 h-5 transition-transform duration-200 group-hover:-translate-x-0.5" />
              )}
            </button>

            <div className="w-9 h-9 rounded-xl bg-[#FEF9E7] border border-amber-200/80 overflow-hidden flex items-center justify-center shrink-0">
              {previewImg ? (
                <img
                  src={previewImg}
                  alt={listing.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-4 h-4 text-[#0D9488]" />
              )}
            </div>

            <div className="min-w-0">
              <h3 className="text-xs font-bold text-[#1E293B] truncate max-w-[160px]">
                {listing.sellerType === 'commercial' ? (listing.storeName || listing.sellerName) : listing.sellerName}
              </h3>
              <p className="text-[11px] text-[#0F766E] font-medium truncate max-w-[160px]">
                {listing.district || 'الموصل'}
              </p>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="text-xs font-extrabold tabular-nums text-[#0F766E]">
              {listing.hidePrice ? 'عند التواصل' : `${listing.price.toLocaleString()} ${listing.currency}`}
            </span>
          </div>
        </div>

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
          {/* Reference Card */}
          <div className="p-2.5 rounded-2xl bg-[#FFFDF9] border border-amber-200/80 shadow-2xs flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#FEF9E7] overflow-hidden flex items-center justify-center shrink-0">
              {previewImg ? (
                <img
                  src={previewImg}
                  alt={listing.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                <Store className="w-4 h-4 text-[#0D9488]" />
              )}
            </div>
            <div className="flex-1 min-w-0 text-xs">
              <span className="font-bold text-[#1E293B] truncate block">
                {listing.title}
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[11px] text-[#0F766E] tabular-nums font-bold">
                  {listing.hidePrice ? 'السعر عند التواصل' : `${listing.price.toLocaleString()} ${listing.currency}`}
                </span>
                <span className="text-[11px] text-[#64748B] flex items-center gap-1">
                  <Truck className="w-3 h-3 text-[#0D9488]" />
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
                className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
                  m.isMe
                    ? 'bg-[#0D9488] text-white rounded-br-xs shadow-xs'
                    : 'bg-[#FFFDF9] text-[#1E293B] border border-amber-200/80 rounded-bl-xs shadow-2xs'
                }`}
              >
                <p>{m.text}</p>
                <div
                  className={`flex items-center justify-end gap-1 text-[10px] mt-1 ${
                    m.isMe ? 'text-teal-100' : 'text-[#64748B]'
                  }`}
                >
                  <span>{m.timestamp}</span>
                  {m.isMe && <CheckCheck className="w-3 h-3 text-teal-100" />}
                </div>
              </div>
            </div>
          ))}

          {/* Typing */}
          {isTyping && (
            <div className="flex items-center gap-1 p-2.5 bg-[#FFFDF9] rounded-xl border border-amber-200/80 w-16 text-[#0D9488]">
              <span className="w-1.5 h-1.5 bg-[#0D9488] rounded-full animate-bounce"></span>
              <span className="w-1.5 h-1.5 bg-[#0D9488] rounded-full animate-bounce [animation-delay:0.2s]"></span>
              <span className="w-1.5 h-1.5 bg-[#0D9488] rounded-full animate-bounce [animation-delay:0.4s]"></span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestions (Zero Horizontal Scroll: Clean Wrap) */}
        <div className="px-3 py-2 bg-[#FFFDF9] border-t border-amber-200/70 flex flex-wrap items-center gap-1.5">
          {quickPrompts.map((q, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSend(q)}
              className="group text-[11px] font-medium text-[#1E293B] bg-[#FEF9E7] hover:bg-teal-50 hover:text-[#0F766E] active:scale-95 px-2.5 py-1 rounded-xl border border-amber-200/80 transition-all inline-flex items-center gap-1"
            >
              <MessageSquare className="w-3 h-3 text-[#0D9488] transition-transform duration-200 group-hover:scale-110" />
              <span>{q}</span>
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="p-3 bg-[#FFFDF9] border-t border-amber-200/70 flex items-center gap-2 pb-safe">
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={isAr ? 'اكتب رسالتك للبائع هنا...' : 'Type message...'}
            className="flex-1 h-10 px-3.5 rounded-xl bg-[#FDFBF7] border border-amber-200/80 text-xs text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#0D9488] focus:bg-white transition-all"
          />

          <button
            type="button"
            onClick={() => handleSend()}
            disabled={!inputVal.trim()}
            className="group w-10 h-10 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] disabled:opacity-40 active:scale-90 text-white flex items-center justify-center transition-all shrink-0"
            aria-label={isAr ? 'إرسال' : 'Send'}
          >
            <Send className="w-4 h-4 rtl:rotate-180 transition-transform duration-200 rtl:group-hover:-translate-x-0.5 ltr:group-hover:translate-x-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
