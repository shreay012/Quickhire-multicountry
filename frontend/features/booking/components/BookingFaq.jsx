'use client';

import FaqSection from '@/components/common/FaqSection';

const BookingFaq = () => {
  const faqs = [
    {
      question: 'How quickly can I book a resource?',
      answer: 'You can book a resource within minutes. Simply select your requirements, complete the payment, and get connected with your dedicated expert immediately.'
    },
    {
      question: 'What types of resources are available?',
      answer: 'We offer a wide range of tech resources including developers, designers, QA engineers, DevOps specialists, data scientists, and project managers.'
    },
    {
      question: 'Can I change my resource requirements after booking?',
      answer: 'Yes, you can modify your requirements. Contact your TPM who will help adjust the resource allocation based on your updated needs.'
    },
    {
      question: 'What payment methods do you accept?',
      answer: 'We accept all major credit cards, debit cards, and bank transfers. Payment is processed securely through our payment gateway.'
    },
    {
      question: 'Is there a minimum booking duration?',
      answer: 'The minimum booking duration is 4 hours. You can extend the booking as needed based on your project requirements.'
    }
  ];

  return (
    <FaqSection
      title="Frequently Asked Questions"
      description="Have questions about booking resources? We've got answers."
      faqs={faqs}
    />
  );
};

export default BookingFaq;
