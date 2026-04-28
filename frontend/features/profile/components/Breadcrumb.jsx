import Link from 'next/link';

const Breadcrumb = ({ activeSection = 'profile' }) => {
  const getSectionLabel = () => {
    switch (activeSection) {
      case 'bookings':
        return 'Bookings';
      case 'payments':
        return 'Payments';
      case 'support':
        return 'Support & Help';
      case 'profile':
      default:
        return 'Profile';
    }
  };

  return (
    <div className="flex items-center gap-2 text-sm font-opensauce mb-6">
      <Link href="/" className="text-gray-600 hover:text-[#45A735] transition-colors">
        Home
      </Link>
      <span className="text-gray-400">/</span>
      {activeSection !== 'profile' ? (
        <>
          <Link
            href="/profile?section=profile"
            className="text-gray-600 hover:text-[#45A735] transition-colors"
          >
            Profile
          </Link>
          <span className="text-gray-400">/</span>
          <span className="text-[#45A735] font-medium">{getSectionLabel()}</span>
        </>
      ) : (
        <span className="text-[#45A735] font-medium">Profile</span>
      )}
    </div>
  );
};

export default Breadcrumb;
