// "use client";

// import { useState, useEffect, useRef } from "react";
// import { useRouter } from "next/navigation";
// import { useDispatch, useSelector } from "react-redux";
// import {
//   sendOtp,
//   verifyOtp,
//   clearError,
//   resetOtpState,
// } from "@/lib/redux/slices/authSlice/authSlice";
// import {
//   getUserProfile,
//   updateUserProfile,
// } from "@/lib/redux/slices/userProfileSlice/userProfileSlice";
// import Image from "next/image";

// const LoginPage = () => {
//   const router = useRouter();
//   const dispatch = useDispatch();
//   const { isLoading, error, otpSent } = useSelector((state) => state.auth);

//   const [isOtpStep, setIsOtpStep] = useState(false);
//   const [errorMessage, setErrorMessage] = useState(null);
//   const [successMessage, setSuccessMessage] = useState(null);
//   const [mobileNumber, setMobileNumber] = useState("");
//   const [otpValues, setOtpValues] = useState(["", "", "", ""]);
//   const [isOtpVerified, setIsOtpVerified] = useState(false);
//   const [showResendTimer, setShowResendTimer] = useState(false);
//   const [resendSeconds, setResendSeconds] = useState(120);
//   const [isMobileFocused, setIsMobileFocused] = useState(false);
//   const [isOtpFocused, setIsOtpFocused] = useState([
//     false,
//     false,
//     false,
//     false,
//   ]);

//   // New user profile states
//   const [isNewUserStep, setIsNewUserStep] = useState(false);
//   const [fullName, setFullName] = useState("");
//   const [email, setEmail] = useState("");
//   const [isFullNameFocused, setIsFullNameFocused] = useState(false);
//   const [isEmailFocused, setIsEmailFocused] = useState(false);
//   const [userData, setUserData] = useState(null); // Store user data from verify-otp
//   // add one more ref with your other refs

//   const autoLoginOtpRef = useRef("");
//   const autoSentNumberRef = useRef("");
//   // Update error message when Redux error changes
//   useEffect(() => {
//     if (error) {
//       setErrorMessage(
//         typeof error === "string"
//           ? error
//           : error.message || "An error occurred",
//       );
//     }
//   }, [error]);

//   // Update OTP step when OTP is sent
//   useEffect(() => {
//     if (otpSent) {
//       setIsOtpStep(true);
//       startResendTimer();
//     }
//   }, [otpSent]);

//   // Responsive detection from Flutter
//   const [isMobile, setIsMobile] = useState(false);
//   const [contentWidth, setContentWidth] = useState(350);
//   const [logoHeight, setLogoHeight] = useState(40);
//   const [verticalSpacing, setVerticalSpacing] = useState(24);

//   useEffect(() => {
//     const handleResize = () => {
//       const width = window.innerWidth;
//       const mobile = width < 768;
//       setIsMobile(mobile);
//       setContentWidth(mobile ? window.innerWidth : 350);
//       setLogoHeight(mobile ? 32 : 40);
//       setVerticalSpacing(mobile ? 12 : 24);
//     };

//     handleResize();
//     window.addEventListener("resize", handleResize);
//     return () => window.removeEventListener("resize", handleResize);
//   }, []);

//   // Timer for resend OTP functionality
//   useEffect(() => {
//     let timer;
//     if (showResendTimer && resendSeconds > 0) {
//       timer = setTimeout(() => {
//         setResendSeconds(resendSeconds - 1);
//       }, 1000);
//     }

//     return () => clearTimeout(timer);
//   }, [showResendTimer, resendSeconds]);

//   const startResendTimer = () => {
//     setResendSeconds(120);
//     setShowResendTimer(true);
//   };

//   // const handleMobileChange = (value) => {
//   //   const digitsOnly = value.replace(/\D/g, "").slice(0, 10);
//   //   setMobileNumber(digitsOnly);

//   //   // Clear OTP fields when mobile number changes (Flutter behavior)
//   //   if (isOtpStep) {
//   //     setOtpValues(["", "", "", ""]);
//   //     setIsOtpStep(false);
//   //     setErrorMessage(null);
//   //     setIsOtpVerified(false);
//   //     dispatch(resetOtpState());
//   //   }
//   // };

//   // 3) replace your handleMobileChange with this
//   // update handleMobileChange (reset OTP auto-login guard when number changes)
//   const handleMobileChange = (value) => {
//     const digitsOnly = value.replace(/\D/g, "").slice(0, 10);
//     setMobileNumber(digitsOnly);

//     if (isOtpStep) {
//       setOtpValues(["", "", "", ""]);
//       setIsOtpStep(false);
//       setErrorMessage(null);
//       setIsOtpVerified(false);
//       dispatch(resetOtpState());
//     }

//     // reset auto-login OTP tracking when mobile changes
//     autoLoginOtpRef.current = "";

//     if (digitsOnly.length < 10) {
//       autoSentNumberRef.current = "";
//       return;
//     }

//     if (
//       digitsOnly.length === 10 &&
//       !isLoading &&
//       !isOtpStep &&
//       autoSentNumberRef.current !== digitsOnly
//     ) {
//       autoSentNumberRef.current = digitsOnly;
//       handleSendOtp(digitsOnly);
//     }
//   };
//   // const handleOtpChange = (index, value) => {
//   //   const digitsOnly = value.replace(/\D/g, "").slice(0, 1);
//   //   const newOtpValues = [...otpValues];
//   //   newOtpValues[index] = digitsOnly;
//   //   setOtpValues(newOtpValues);

//   //   // Auto-focus next field (Flutter behavior)
//   //   if (digitsOnly && index < 3) {
//   //     const nextInput = document.getElementById(`otp-${index + 1}`);
//   //     nextInput?.focus();
//   //   } else if (!digitsOnly && index > 0) {
//   //     const prevInput = document.getElementById(`otp-${index - 1}`);
//   //     prevInput?.focus();
//   //   }

//   //   // Check if OTP is complete (all 4 digits entered)
//   //   if (newOtpValues.every((val) => val.length === 1)) {
//   //     setIsOtpVerified(true);
//   //     setErrorMessage(null);
//   //   } else {
//   //     setIsOtpVerified(false);
//   //   }
//   // };

//   // replace handleOtpChange with auto-login behavior

//   // replace handleOtpChange
//   const handleOtpChange = (index, value) => {
//     const digitsOnly = value.replace(/\D/g, "").slice(0, 1);
//     const newOtpValues = [...otpValues];
//     newOtpValues[index] = digitsOnly;
//     setOtpValues(newOtpValues);

//     if (digitsOnly && index < 3) {
//       const nextInput = document.getElementById(`otp-${index + 1}`);
//       nextInput?.focus();
//     } else if (!digitsOnly && index > 0) {
//       const prevInput = document.getElementById(`otp-${index - 1}`);
//       prevInput?.focus();
//     }

//     const otp = newOtpValues.join("");
//     const isComplete = newOtpValues.every((val) => val.length === 1);

//     if (isComplete) {
//       setIsOtpVerified(true);
//       setErrorMessage(null);

//       // when last OTP is entered, auto call handleLogin once
//       if (
//         isOtpStep &&
//         !isLoading &&
//         mobileNumber.length === 10 &&
//         autoLoginOtpRef.current !== otp
//       ) {
//         autoLoginOtpRef.current = otp;
//         handleLogin(otp);
//       }
//     } else {
//       setIsOtpVerified(false);
//       autoLoginOtpRef.current = "";
//     }
//   };
//   const handleSendOtp = async (number) => {
//     // Validate mobile number
//     if (!number || number.length !== 10) {
//       setErrorMessage("Please enter a valid 10-digit mobile number");
//       return;
//     }

//     try {
//       setErrorMessage(null);
//       dispatch(clearError());

//       // Dispatch the sendOtp action
//       const result = await dispatch(sendOtp(number)).unwrap();

//       // Show success message
//       setSuccessMessage("OTP has been Sent Successfully");

//       // Auto-hide success message after 3 seconds
//       setTimeout(() => {
//         setSuccessMessage(null);
//       }, 3000);
//     } catch (error) {
//       setErrorMessage(
//         typeof error === "string"
//           ? error
//           : error.message || "Failed to send OTP. Please try again.",
//       );
//     }
//   };

//   // This function is no longer needed for auto-verification
//   // OTP verification now happens only on login button click

//   // const handleResendOtp = async (number) => {
//   //   // Validate mobile number
//   //   if (!number || number.length !== 10) {
//   //     setErrorMessage("Please enter a valid 10-digit mobile number");
//   //     return;
//   //   }

//   //   try {
//   //     setErrorMessage(null);
//   //     dispatch(clearError());
//   //     dispatch(resetOtpState());

//   //     // Reset timer
//   //     setResendSeconds(120);

//   //     // Call send OTP API
//   //     const result = await dispatch(sendOtp(number)).unwrap();

//   //     // Show success message
//   //     setSuccessMessage("OTP has been Sent Successfully");

//   //     // Auto-hide success message after 3 seconds
//   //     setTimeout(() => {
//   //       setSuccessMessage(null);
//   //     }, 3000);
//   //   } catch (error) {
//   //     setErrorMessage(
//   //       typeof error === "string"
//   //         ? error
//   //         : error.message || "Failed to resend OTP. Please try again.",
//   //     );
//   //   }
//   // };

//   // in handleResendOtp, reset OTP auto-login guard too
//   const handleResendOtp = async (number) => {
//     if (!number || number.length !== 10) {
//       setErrorMessage("Please enter a valid 10-digit mobile number");
//       return;
//     }

//     try {
//       setErrorMessage(null);
//       dispatch(clearError());
//       dispatch(resetOtpState());
//       autoLoginOtpRef.current = ""; // reset for new OTP

//       setResendSeconds(120);
//       await dispatch(sendOtp(number)).unwrap();

//       setSuccessMessage("OTP has been Sent Successfully");
//       setTimeout(() => {
//         setSuccessMessage(null);
//       }, 3000);
//     } catch (error) {
//       setErrorMessage(
//         typeof error === "string"
//           ? error
//           : error.message || "Failed to resend OTP. Please try again.",
//       );
//     }
//   };

//   // const handleLogin = async () => {
//   //   // Validate OTP is complete
//   //   const otp = otpValues.join("");
//   //   if (otp.length !== 4) {
//   //     setErrorMessage("Please enter complete OTP");
//   //     return;
//   //   }

//   //   try {
//   //     setErrorMessage(null);
//   //     dispatch(clearError());

//   //     const fcmToken = "";

//   //     // Call verify OTP API only when login button is clicked
//   //     const result = await dispatch(
//   //       verifyOtp({ mobileNumber, otp, fcmToken }),
//   //     ).unwrap();

//   //     // Show success message for OTP verification
//   //     setSuccessMessage("OTP Verified");

//   //     // Auto-hide success message after 2 seconds
//   //     setTimeout(() => {
//   //       setSuccessMessage(null);
//   //     }, 2000);

//   //     // Store token and user data if present
//   //     if (result.data?.token || result.token) {
//   //       const token = result.data?.token || result.token;
//   //       localStorage.setItem("token", token);
//   //     }

//   //     const user = result.data?.user || result.user;
//   //     if (user) {
//   //       console.log("💾 Saving user to localStorage:", user._id || user.id);
//   //       localStorage.setItem("user", JSON.stringify(user));
//   //       // Store user data in state for profile update
//   //       setUserData(user);

//   //       console.log("📡 Triggering socket connection...");
//   //       // Trigger socket connection by notifying SocketProvider
//   //       if (typeof window !== "undefined") {
//   //         window.dispatchEvent(new Event("userLoggedIn"));
//   //         console.log("✅ userLoggedIn event dispatched");
//   //       }
//   //     }

//   //     // Always fetch complete profile after successful login

//   //     try {
//   //       const profileResult = await dispatch(getUserProfile()).unwrap();

//   //       // Update user data with complete profile, preserving id from verify-otp
//   //       if (profileResult.user || profileResult) {
//   //         const fetchedProfile = profileResult.user || profileResult;
//   //         // Merge with original user data to ensure id is preserved
//   //         const completeUser = {
//   //           ...fetchedProfile,
//   //           id: user.id || fetchedProfile.id || fetchedProfile._id, // Preserve id from verify-otp
//   //           mobile: user.mobile || fetchedProfile.mobile,
//   //           role: user.role || fetchedProfile.role,
//   //         };
//   //         localStorage.setItem("user", JSON.stringify(completeUser));
//   //         setUserData(completeUser); // Update state with complete profile
//   //       }
//   //     } catch (profileError) {}

//   //     // Check if new user (profile incomplete)
//   //     if (result.data?.isNewUser || result.isNewUser) {
//   //       // Show profile completion form
//   //       setIsNewUserStep(true);
//   //       return;
//   //     }

//   //     // Note: Socket connection is now handled by SocketProvider globally
//   //     // No need to connect here - it will auto-connect when user data exists in localStorage

//   //     // Navigate to home for existing users
//   //     setTimeout(() => {
//   //       router.push("/");
//   //     }, 500);
//   //   } catch (error) {
//   //     setErrorMessage(
//   //       typeof error === "string"
//   //         ? error
//   //         : error.message || "Login failed. Please try again.",
//   //     );
//   //     setIsOtpVerified(false);
//   //   }
//   // };

//   // make handleLogin accept optional OTP (so we can call it instantly with latest typed value)

//   // update handleLogin to accept optional otpOverride
//   const handleLogin = async (otpOverride) => {
//     const otp = otpOverride ?? otpValues.join("");
//     if (otp.length !== 4) {
//       setErrorMessage("Please enter complete OTP");
//       return;
//     }

//     try {
//       setErrorMessage(null);
//       dispatch(clearError());

//       const fcmToken = "";
//       const result = await dispatch(
//         verifyOtp({ mobileNumber, otp, fcmToken }),
//       ).unwrap();

//       setSuccessMessage("OTP Verified");
//       setTimeout(() => setSuccessMessage(null), 2000);

//       // keep your existing success logic below unchanged...
//       if (result.data?.token || result.token) {
//         const token = result.data?.token || result.token;
//         localStorage.setItem("token", token);
//       }

//       const user = result.data?.user || result.user;
//       if (user) {
//         localStorage.setItem("user", JSON.stringify(user));
//         setUserData(user);
//         if (typeof window !== "undefined") {
//           window.dispatchEvent(new Event("userLoggedIn"));
//         }
//       }

//       try {
//         const profileResult = await dispatch(getUserProfile()).unwrap();
//         if (profileResult.user || profileResult) {
//           const fetchedProfile = profileResult.user || profileResult;
//           const completeUser = {
//             ...fetchedProfile,
//             id: user.id || fetchedProfile.id || fetchedProfile._id,
//             mobile: user.mobile || fetchedProfile.mobile,
//             role: user.role || fetchedProfile.role,
//           };
//           localStorage.setItem("user", JSON.stringify(completeUser));
//           setUserData(completeUser);
//         }
//       } catch (profileError) {}

//       if (result.data?.isNewUser || result.isNewUser) {
//         setIsNewUserStep(true);
//         return;
//       }

//       setTimeout(() => router.push("/"), 500);
//     } catch (error) {
//       setErrorMessage(
//         typeof error === "string"
//           ? error
//           : error.message || "Login failed. Please try again.",
//       );
//       setIsOtpVerified(false);
//       autoLoginOtpRef.current = ""; // allow retry if failed
//     }
//   };

//   const handleSaveProfile = async () => {
//     // Validate fields
//     if (!fullName.trim()) {
//       setErrorMessage("Please enter your full name");
//       return;
//     }
//     if (!email.trim()) {
//       setErrorMessage("Please enter your email address");
//       return;
//     }

//     // Email validation
//     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//     if (!emailRegex.test(email)) {
//       setErrorMessage("Please enter a valid email address");
//       return;
//     }

//     // Check if userData is available
//     if (!userData) {
//       setErrorMessage("User data not found. Please try logging in again.");
//       return;
//     }

//     // Get user ID from userData (handle different possible field names)
//     const userId = userData.id || userData._id || userData.userId;

//     if (!userId) {
//       setErrorMessage("User ID not found. Please try logging in again.");
//       return;
//     }

//     try {
//       setErrorMessage(null);
//       dispatch(clearError());

//       // Prepare payload with all required fields from verify-otp response
//       const profilePayload = {
//         id: userId,
//         name: fullName,
//         email: email,
//         mobile: userData.mobile || mobileNumber,
//         role: userData.role || "user",
//       };

//       // Call API to update user profile using Redux thunk
//       const response = await dispatch(
//         updateUserProfile(profilePayload),
//       ).unwrap();

//       // Fetch complete profile after update using Redux thunk

//       try {
//         const profileResult = await dispatch(getUserProfile()).unwrap();

//         // Update user data with complete profile
//         if (profileResult.user || profileResult) {
//           const completeUser = profileResult.user || profileResult;
//           localStorage.setItem("user", JSON.stringify(completeUser));
//         }
//       } catch (profileError) {
//         // Use the updated user data we already have
//         const updatedUser = {
//           ...userData,
//           name: fullName,
//           email: email,
//         };
//         localStorage.setItem("user", JSON.stringify(updatedUser));
//       }

//       // Navigate to home
//       setTimeout(() => {
//         router.push("/");
//       }, 500);
//     } catch (error) {
//       setErrorMessage(
//         typeof error === "string"
//           ? error
//           : error.message || "Failed to save profile. Please try again.",
//       );
//     }
//   };

//   const formatTime = (seconds) => {
//     const minutes = Math.floor(seconds / 60);
//     const remainingSeconds = seconds % 60;
//     return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
//   };

//   const containerHeight = isMobile ? 48 : 45;
//   const fontSize = 14;
//   const otpFieldWidth = isMobile ? 52 : 68;
//   const otpFieldHeight = isMobile ? 48 : 45;
//   const spacingBetweenFields = isMobile ? 8 : 10;
//   const buttonHeight = isMobile ? 48 : 45;

//   return (
//     <div className={`${isMobile ? "flex flex-col" : "h-screen flex flex-row"}`}>
//       {/* Left Side - Login Image (Desktop only - left side) */}
//       {!isMobile && (
//         <div className="w-1/2 h-full relative">
//           <Image
//             src="/images/login/login_image.png"
//             alt="Login"
//             fill
//             className="object-cover"
//             priority
//           />
//         </div>
//       )}

//       {/* Right Side - Login Form */}
//       <div
//         className={`${isMobile ? "w-full" : "w-1/2 h-full"} relative`}
//         style={{ backgroundColor: "#FFFFFF" }}
//       >
//         {/* Success Message - Top Center */}
//         {successMessage && (
//           <div
//             className="absolute left-1/2 transform -translate-x-1/2"
//             style={{
//               top: isMobile ? "16px" : "20px",
//               zIndex: 20,
//               animation: "fadeIn 0.3s ease-in-out",
//               width: "auto",
//               maxWidth: isMobile ? "calc(100% - 32px)" : "310px",
//             }}
//           >
//             <div
//               className="flex items-center justify-center"
//               style={{
//                 backgroundColor:
//                   successMessage === "OTP Verified" ? "#45A735" : "#242424",
//                 borderRadius: "40px",
//                 boxShadow: "none",
//                 padding: isMobile ? "10px 20px" : "12px 20px",
//                 whiteSpace: "nowrap",
//               }}
//             >
//               <span
//                 style={{
//                   fontSize: isMobile ? "12px" : "14px",
//                   fontWeight: 400,
//                   color: "#FFFFFF",
//                   fontFamily: "'OpenSauceOne', sans-serif",
//                   textAlign: "center",
//                 }}
//               >
//                 {successMessage}
//               </span>
//             </div>
//           </div>
//         )}

//         {/* Skip Button - Top Right (Flutter exact implementation) */}

//         {/* <div
//           className="absolute"
//           style={{
//             top: isMobile ? "16px" : "30px",
//             right: isMobile ? "16px" : "20px",
//             zIndex: 10,
//           }}
//         >
//           <button
//             onClick={() => router.push("/")}
//             className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors hover:bg-gray-100"
//             style={{
//               padding: "8px 16px",
//               borderRadius: "8px",
//             }}
//           >
//             <span
//               style={{
//                 fontSize: isMobile ? "16px" : "18px",
//                 fontWeight: 500,
//                 color: "#45A735",

//                 display: "inline-flex",
//                 alignItems: "center",
//               }}
//             >
//               Skip
//               <Image
//                 src="/ArrowLeft.svg"
//                 alt="arrow"
//                 width={16}
//                 height={16}
//                 style={{
//                   marginLeft: "6px",
//                   verticalAlign: "middle",
//                   transform: "rotate(45deg)",
//                 }}
//               />
//             </span>
//           </button>
//         </div> */}

//         {!isNewUserStep && (
//           <div
//             className="absolute"
//             style={{
//               top: isMobile ? "16px" : "30px",
//               right: isMobile ? "16px" : "20px",
//               zIndex: 10,
//             }}
//           >
//             <button
//               onClick={() => router.push("/")}
//               className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors hover:bg-gray-100"
//               style={{
//                 padding: "8px 16px",
//                 borderRadius: "8px",
//               }}
//             >
//               <span
//                 style={{
//                   fontSize: isMobile ? "12px" : "15px",
//                   fontWeight: 700,
//                   color: "#45A735",
//                   display: "inline-flex",
//                   alignItems: "center",
//                 }}
//               >
//                 Skip
//                 <Image
//                   src="/ArrowLeft.svg"
//                   alt="arrow"
//                   width={16}
//                   height={16}
//                   style={{
//                     marginLeft: "6px",
//                     verticalAlign: "middle",
//                     transform: "rotate(45deg)",
//                   }}
//                 />
//               </span>
//             </button>
//           </div>
//         )}

//         {/* Login Form Content - Exact Flutter implementation */}
//         <div
//           className={`${isMobile ? "py-4 px-4" : "flex items-center justify-center h-full"}`}
//         >
//           <div
//             className="w-full"
//             style={{
//               padding: isMobile ? "0" : "16px",
//               maxWidth: "100%",
//             }}
//           >
//             <div className="flex flex-col items-center">
//               {/* Content container matching Flutter ConstrainedBox */}
//               <div
//                 className="w-full"
//                 style={{
//                   maxWidth: isMobile ? "none" : 350,
//                   marginTop: isMobile ? "48px" : "0",
//                 }}
//               >
//                 {/* QuickHire Logo - exact Flutter implementation */}
//                 <div
//                   style={{
//                     height: `${logoHeight}px`,
//                     marginBottom: `${isMobile ? 16 : verticalSpacing}px`,
//                   }}
//                 >
//                   <Image
//                     src="/quickhire-logo.svg"
//                     alt="QuickHire"
//                     width={logoHeight * 3}
//                     height={logoHeight}
//                     className="h-auto"
//                     style={{ height: `${logoHeight}px`, width: "auto" }}
//                   />
//                 </div>

//                 {/* Conditional Rendering: New User Profile or Login Form */}
//                 {isNewUserStep ? (
//                   /* New User Profile Completion Form */
//                   <>
//                     {/* Welcome Text */}
//                     <div style={{ marginBottom: "16px" }}>
//                       <h2
//                         style={{
//                           fontSize: "var(--font-size-24)",
//                           fontWeight: "var(--font-weight-600)",
//                           color: "var(--text-primary)",
//                         }}
//                       >
//                         Welcome to QuickHire
//                       </h2>
//                     </div>

//                     {/* Subtitle */}
//                     <p
//                       style={{
//                         fontSize: "var(--font-size-14)",
//                         fontWeight: "var(--font-weight-400)",
//                         color: "var(--text-muted)",
//                         fontFamily: "'OpenSauceOne', sans-serif",
//                         marginBottom: `${isMobile ? 12 : 16}px`,
//                       }}
//                     >
//                       We want to know more about you
//                     </p>

//                     {/* Divider line */}
//                     <div
//                       style={{
//                         width: "100%",
//                         borderBottom:
//                           "1px solid var(--Ui-Color-Secondary-Light, #D9E5E3)",
//                         marginBottom: isMobile ? "12px" : "16px",
//                       }}
//                     />

//                     {/* Error message display */}
//                     {errorMessage && errorMessage !== "" && (
//                       <div
//                         className="flex items-start gap-3"
//                         style={{
//                           width: "100%",
//                           padding: "12px 16px",
//                           marginBottom: isMobile ? "12px" : "16px",
//                           backgroundColor: "#E74C3C",
//                           borderRadius: "24px",
//                         }}
//                       >
//                         <div
//                           className="text-white flex-shrink-0"
//                           style={{ fontSize: "20px", marginTop: "2px" }}
//                         >
//                           ⚠️
//                         </div>
//                         <span
//                           className="text-white flex-1"
//                           style={{
//                             fontSize: "13px",
//                             color: "#FFFFFF",
//                             fontFamily: "'OpenSauceOne', sans-serif",
//                             lineHeight: 1.4,
//                           }}
//                         >
//                           {errorMessage}
//                         </span>
//                       </div>
//                     )}

//                     {/* Full Name Field */}
//                     <div style={{ marginBottom: `${verticalSpacing}px` }}>
//                       <div style={{ marginBottom: `${isMobile ? 8 : 12}px` }}>
//                         <span
//                           style={{
//                             fontSize: "var(--font-size-12)",
//                             fontWeight: "var()",
//                             color: "var(--text-primary)",
//                           }}
//                         >
//                           Full Name <span style={{ color: "#DC3545" }}>*</span>
//                         </span>
//                       </div>
//                       <div
//                         style={{
//                           width: "100%",
//                           height: `${containerHeight}px`,
//                           backgroundColor: "#FFFFFF",
//                           borderRadius: "12px",
//                           border: `1px solid ${isFullNameFocused ? "#45A735" : "#E5E5E5"}`,
//                         }}
//                       >
//                         <input
//                           type="text"
//                           value={fullName}
//                           onChange={(e) => setFullName(e.target.value)}
//                           onFocus={() => setIsFullNameFocused(true)}
//                           onBlur={() => setIsFullNameFocused(false)}
//                           placeholder="Enter your full name"
//                           className="w-full h-full bg-transparent outline-none"
//                           style={{
//                             fontSize: `${fontSize}px`,
//                             color: "#484848",
//                             fontFamily: "'OpenSauceOne', sans-serif",
//                             paddingLeft: isMobile ? "12px" : "16px",
//                             paddingRight: isMobile ? "12px" : "16px",
//                             paddingTop: "12px",
//                             paddingBottom: "12px",
//                             borderRadius: "12px",
//                           }}
//                         />
//                       </div>
//                     </div>

//                     {/* Email Address Field */}
//                     <div style={{ marginBottom: `${verticalSpacing}px` }}>
//                       <div style={{ marginBottom: `${isMobile ? 8 : 12}px` }}>
//                         <span
//                           style={{
//                             fontSize: "var(--font-size-12)",
//                             fontWeight: "var()",
//                             color: "var(--text-primary)",
//                           }}
//                         >
//                           Email Address{" "}
//                           <span style={{ color: "#DC3545" }}>*</span>
//                         </span>
//                       </div>
//                       <div
//                         style={{
//                           width: "100%",
//                           height: `${containerHeight}px`,
//                           backgroundColor: "#FFFFFF",
//                           borderRadius: "12px",
//                           border: `1px solid ${isEmailFocused ? "#45A735" : "#E5E5E5"}`,
//                         }}
//                       >
//                         <input
//                           type="email"
//                           value={email}
//                           onChange={(e) => setEmail(e.target.value)}
//                           onFocus={() => setIsEmailFocused(true)}
//                           onBlur={() => setIsEmailFocused(false)}
//                           placeholder="example@gmail.com"
//                           className="w-full h-full bg-transparent outline-none"
//                           style={{
//                             fontSize: `${fontSize}px`,
//                             color: "#484848",
//                             fontFamily: "'OpenSauceOne', sans-serif",
//                             paddingLeft: isMobile ? "12px" : "16px",
//                             paddingRight: isMobile ? "12px" : "16px",
//                             paddingTop: "12px",
//                             paddingBottom: "12px",
//                             borderRadius: "12px",
//                           }}
//                         />
//                       </div>
//                     </div>
//                   </>
//                 ) : (
//                   /* Original Login Form */
//                   <>
//                     {/* Welcome Text - Hidden on mobile (exact Flutter behavior) */}
//                     {!isMobile && (
//                       <div style={{ marginBottom: "16px" }}>
//                         <h2
//                           style={{
//                             fontSize: "var(--font-size-24)",
//                             fontWeight: "var(--font-weight-600)",
//                             color: "var(  --text-primary)",
//                           }}
//                         >
//                           Welcome to Quick Hire
//                         </h2>
//                       </div>
//                     )}

//                     {/* Subtitle - exact Flutter implementation */}
//                     <p
//                       style={{
//                         fontSize: "var(--font-size-14)",
//                         fontWeight: "var(--font-weight-400)",
//                         color: "var( --text-muted)",
//                         fontFamily: "'OpenSauceOne', sans-serif",
//                         // height: '16.8px',
//                         // letterSpacing: '0',
//                         // lineHeight: 1.2,
//                         // maxWidth: '100%',
//                         // overflow: 'hidden',
//                         // textOverflow: 'ellipsis',
//                         // display: '-webkit-box',
//                         // WebkitLineClamp: 2,
//                         // WebkitBoxOrient: 'vertical',
//                         marginBottom: `${isMobile ? 12 : 16}px`,
//                       }}
//                     >
//                       Sign in to hire verified IT professionals instantly.
//                     </p>

//                     {/* Divider line - exact Flutter implementation */}
//                     <div
//                       style={{
//                         width: "100%",

//                         borderBottom:
//                           "1px solid var(--Ui-Color-Secondary-Light, #D9E5E3)",

//                         marginBottom: isMobile ? "12px" : "16px",
//                       }}
//                     />

//                     {/* Error message display - exact Flutter implementation */}
//                     {errorMessage && errorMessage !== "" && (
//                       <div
//                         className="flex items-start gap-3"
//                         style={{
//                           width: "100%",
//                           padding: "12px 16px",
//                           marginBottom: isMobile ? "12px" : "16px",
//                           backgroundColor: "#FF48481A",
//                           borderRadius: "12px",
//                           border: "1px solid #FF4848",
//                         }}
//                       >
//                         {/* <div
//                           className="text-white flex-shrink-0"
//                           style={{ fontSize: "20px", marginTop: "2px" }}
//                         >
//                           ⚠️
//                         </div> */}
//                         <span
//                           className="text-white flex-1"
//                           style={{
//                             fontSize: "14px",
//                             color: "#FF4848",
//                             fontFamily: "'OpenSauceOne', sans-serif",

//                             textAlign: "center",
//                           }}
//                         >
//                           {errorMessage}
//                         </span>
//                       </div>
//                     )}

//                     {/* Mobile Number Section - exact Flutter implementation */}
//                     <div style={{ marginBottom: `${verticalSpacing}px` }}>
//                       {/* Mobile Number Label */}
//                       <div style={{ marginBottom: `${isMobile ? 8 : 12}px` }}>
//                         <span
//                           style={{
//                             fontSize: "var( --font-size-12)",
//                             fontWeight: "var()",
//                             color: "var(--text-primary)",
//                           }}
//                         >
//                           Mobile Number{" "}
//                           <span style={{ color: "#DC3545" }}>*</span>
//                         </span>
//                       </div>

//                       {/* Mobile Number Input - exact Flutter implementation */}
//                       <div
//                         className="flex"
//                         style={{
//                           width: "100%",
//                           height: `${containerHeight}px`,
//                           backgroundColor: "#FFFFFF",
//                           borderRadius: "12px",
//                           border: `1px solid ${isMobileFocused ? "#45A735" : "#E5E5E5"}`,
//                         }}
//                       >
//                         {/* Mobile Number TextField */}
//                         <div className="flex-1 flex items-center">
//                           <input
//                             type="tel"
//                             value={mobileNumber}
//                             onChange={(e) => handleMobileChange(e.target.value)}
//                             onFocus={() => setIsMobileFocused(true)}
//                             onBlur={() => setIsMobileFocused(false)}
//                             placeholder="Enter Mobile Number"
//                             className="w-full h-full bg-transparent outline-none"
//                             style={{
//                               fontSize: `${fontSize}px`,
//                               color: "#484848",
//                               fontFamily: "'OpenSauceOne', sans-serif",
//                               paddingLeft: isMobile ? "12px" : "16px",
//                               paddingRight: "12px",
//                               paddingTop: "12px",
//                               paddingBottom: "12px",
//                             }}
//                             maxLength={10}
//                           />
//                         </div>

//                         {/* Send OTP Button - exact Flutter implementation */}
//                         <div
//                           className="flex items-center"
//                           style={{
//                             height: `${containerHeight}px`,
//                             padding: isMobile ? "2px" : "4px",
//                           }}
//                         >
//                           <button
//                             onClick={() =>
//                               mobileNumber.length === 10 &&
//                               handleSendOtp(mobileNumber)
//                             }
//                             disabled={isLoading || isOtpStep}
//                             className="px-4 py-2 transition-colors"
//                             style={{
//                               fontSize: `${fontSize}px`,
//                               fontWeight: 400,
//                               color: "#45A735",
//                               fontFamily: "'OpenSauceOne', sans-serif",
//                               backgroundColor: "transparent",
//                               border: "none",
//                               cursor:
//                                 isLoading || isOtpStep
//                                   ? "not-allowed"
//                                   : "pointer",
//                               opacity: isLoading || isOtpStep ? 0.6 : 1,
//                               padding: isMobile ? "12px 16px" : "16px 24px",
//                               borderRadius: "12px",
//                             }}
//                           >
//                             {isOtpVerified
//                               ? "OTP Verified"
//                               : isLoading
//                                 ? "Verifying"
//                                 : isOtpStep
//                                   ? "OTP Sent"
//                                   : "Send OTP"}
//                           </button>
//                         </div>
//                       </div>
//                     </div>

//                     {/* OTP Section - exact Flutter implementation */}
//                     <div style={{ marginBottom: `${verticalSpacing}px` }}>
//                       {/* OTP Label */}
//                       <div style={{ marginBottom: `${isMobile ? 8 : 12}px` }}>
//                         <span
//                           style={{
//                             fontSize: "var( --font-size-12)",
//                             fontWeight: "var()",
//                             color: "var(--text-primary)",
//                           }}
//                         >
//                           OTP <span style={{ color: "#DC3545" }}>*</span>
//                         </span>
//                       </div>

//                       {/* OTP Input Row with dots between them - exact Flutter implementation */}
//                       <div className="flex items-center">
//                         {otpValues.map((value, index) => (
//                           <div key={index} className="flex items-center">
//                             {/* OTP Input Field */}
//                             <div
//                               style={{
//                                 width: `${otpFieldWidth}px`,
//                                 height: `${otpFieldHeight}px`,
//                                 backgroundColor: "#FFFFFF",
//                                 borderRadius: "12px",
//                                 border: `1px solid ${
//                                   errorMessage && isOtpStep
//                                     ? "#DC3545"
//                                     : isOtpFocused[index]
//                                       ? "#45A735"
//                                       : "#D9D9D9"
//                                 }`,
//                               }}
//                             >
//                               <input
//                                 id={`otp-${index}`}
//                                 type="text"
//                                 value={value}
//                                 onChange={(e) =>
//                                   handleOtpChange(index, e.target.value)
//                                 }
//                                 onFocus={() => {
//                                   const newFocused = [...isOtpFocused];
//                                   newFocused[index] = true;
//                                   setIsOtpFocused(newFocused);
//                                 }}
//                                 onBlur={() => {
//                                   const newFocused = [...isOtpFocused];
//                                   newFocused[index] = false;
//                                   setIsOtpFocused(newFocused);
//                                 }}
//                                 placeholder="-"
//                                 className="w-full h-full bg-transparent outline-none text-center"
//                                 style={{
//                                   fontSize: "14px",
//                                   color: "#484848",
//                                   fontFamily: "'OpenSauceOne', sans-serif",
//                                 }}
//                                 maxLength={1}
//                                 disabled={!isOtpStep}
//                               />
//                             </div>

//                             {/* Add dot between boxes (except after the last one) - exact Flutter implementation */}
//                             {index < 3 && (
//                               <>
//                                 <div
//                                   style={{ width: `${spacingBetweenFields}px` }}
//                                 />
//                                 <div
//                                   style={{
//                                     width: isMobile ? "4px" : "6px",
//                                     height: isMobile ? "4px" : "6px",
//                                     backgroundColor: "#D9D9D9",
//                                     borderRadius: "50%",
//                                   }}
//                                 />
//                                 <div
//                                   style={{ width: `${spacingBetweenFields}px` }}
//                                 />
//                               </>
//                             )}
//                           </div>
//                         ))}
//                       </div>

//                       {/* Resend OTP Section - exact Flutter implementation */}
//                       {showResendTimer &&
//                         !errorMessage?.toLowerCase().includes("locked") &&
//                         !errorMessage
//                           ?.toLowerCase()
//                           .includes("attempts exceeded") && (
//                           <div
//                             className="flex items-center mt-3"
//                             style={{ marginTop: isMobile ? 12 : 16 }}
//                           >
//                             <span
//                               className="flex-1"
//                               style={{
//                                 fontSize: "12px",
//                                 fontWeight: 400,
//                                 color: "#484848",
//                                 fontFamily: "'OpenSauceOne', sans-serif",
//                               }}
//                             >
//                               Did not receive OTP yet?
//                             </span>
//                             <div className="flex items-center">
//                               <Image
//                                 src="/resendicon.svg"
//                                 alt="check"
//                                 width={24}
//                                 height={24}
//                                 style={{ marginRight: "8px" }}
//                               />
//                               {resendSeconds === 0 ? (
//                                 <button
//                                   onClick={() => handleResendOtp(mobileNumber)}
//                                   className="text-green-600 font-medium"
//                                   style={{
//                                     fontSize: "12px",
//                                     fontWeight: 400,
//                                     color: "#484848",
//                                     fontFamily: "'OpenSauceOne', sans-serif",
//                                     cursor: "pointer",
//                                   }}
//                                 >
//                                   Resend
//                                 </button>
//                               ) : (
//                                 <div className="flex items-center">
//                                   <span
//                                     style={{
//                                       fontSize: "12px",
//                                       fontWeight: 400,
//                                       color: "#484848",
//                                       fontFamily: "'OpenSauceOne', sans-serif",
//                                     }}
//                                   >
//                                     Resend{" "}
//                                   </span>

//                                   <span
//                                     style={{
//                                       fontSize: "12px",
//                                       fontWeight: 700,
//                                       color: "#45A735",
//                                       fontFamily: "'OpenSauceOne', sans-serif",
//                                       marginLeft: "8px", // Add space between "Resend" and timer
//                                     }}
//                                   >
//                                     {formatTime(resendSeconds)}
//                                   </span>
//                                 </div>
//                               )}
//                             </div>
//                           </div>
//                         )}
//                     </div>
//                   </>
//                 )}

//                 {/* Divider line - exact Flutter implementation */}
//                 <div
//                   style={{
//                     width: "100%",
//                     height: "1px",
//                     borderBottom: "1px solid #E5E5E5",
//                     marginBottom: `${verticalSpacing}px`,
//                   }}
//                 />
//               </div>

//               {/* Action Button (outside to maintain center alignment) - exact Flutter implementation */}
//               <div
//                 style={{
//                   width: isMobile ? "100%" : 350,
//                   height: `${buttonHeight}px`,
//                   marginBottom: isMobile ? "12px" : "0",
//                 }}
//               >
//                 {isLoading ? (
//                   <div
//                     className="flex items-center justify-center w-full h-full"
//                     style={{
//                       backgroundColor: "rgba(69, 167, 53, 0.5)",
//                       borderRadius: "12px",
//                     }}
//                   >
//                     <div
//                       className="animate-spin rounded-full border-2 border-white border-t-transparent"
//                       style={{
//                         width: "24px",
//                         height: "24px",
//                         borderWidth: "2px",
//                       }}
//                     />
//                   </div>
//                 ) : (
//                   <button
//                     onClick={isNewUserStep ? handleSaveProfile : handleLogin}
//                     disabled={
//                       isNewUserStep
//                         ? !fullName.trim() || !email.trim()
//                         : !isOtpVerified
//                     }
//                     className="w-full h-full transition-colors"
//                     style={{
//                       backgroundColor: (
//                         isNewUserStep
//                           ? fullName.trim() && email.trim()
//                           : isOtpVerified
//                       )
//                         ? "#45A735"
//                         : "rgba(69, 167, 53, 0.5)",
//                       borderRadius: "12px",
//                       padding: isMobile ? "0 20px" : "0 24px",
//                       cursor: (
//                         isNewUserStep
//                           ? fullName.trim() && email.trim()
//                           : isOtpVerified
//                       )
//                         ? "pointer"
//                         : "not-allowed",
//                     }}
//                   >
//                     <span
//                       style={{
//                         fontSize: isMobile ? "15px" : "16px",
//                         fontWeight: 400,
//                         color: "#FFFFFF",
//                         fontFamily: "'OpenSauceOne', sans-serif",
//                       }}
//                     >
//                       {isNewUserStep ? "Save and continue" : "Login"}
//                     </span>
//                   </button>
//                 )}
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Mobile - Login Image (Below form) */}
//       {/* {isMobile && (
//         <div className="w-full">
//           <Image
//             src="/images/login/login_image.png"
//             alt="Login"
//             width={768}
//             height={400}
//             className="w-full h-auto object-cover"
//           />
//         </div>
//       )} */}
//     </div>
//   );
// };

// export default LoginPage;

// this 2nd flow is correct

"use client";

// import { useState, useEffect, useRef } from "react";
// import { useRouter } from "next/navigation";
// import { useDispatch, useSelector } from "react-redux";
// import {
//   sendOtp,
//   verifyOtp,
//   clearError,
//   resetOtpState,
// } from "@/lib/redux/slices/authSlice/authSlice";
// import {
//   getUserProfile,
//   updateUserProfile,
// } from "@/lib/redux/slices/userProfileSlice/userProfileSlice";
// import Image from "next/image";

// const LoginPage = () => {
//   const router = useRouter();
//   const dispatch = useDispatch();
//   const { isLoading, error, otpSent } = useSelector((state) => state.auth);

//   const [isOtpStep, setIsOtpStep] = useState(false);
//   const [errorMessage, setErrorMessage] = useState(null);
//   const [successMessage, setSuccessMessage] = useState(null);
//   const [mobileNumber, setMobileNumber] = useState("");
//   const [otpValues, setOtpValues] = useState(["", "", "", ""]);
//   const [isOtpVerified, setIsOtpVerified] = useState(false);
//   const [showResendTimer, setShowResendTimer] = useState(false);
//   const [resendSeconds, setResendSeconds] = useState(120);
//   const [isMobileFocused, setIsMobileFocused] = useState(false);
//   const [isOtpFocused, setIsOtpFocused] = useState([
//     false,
//     false,
//     false,
//     false,
//   ]);

//   // New user profile states
//   const [isNewUserStep, setIsNewUserStep] = useState(false);
//   const [fullName, setFullName] = useState("");
//   const [email, setEmail] = useState("");
//   const [isFullNameFocused, setIsFullNameFocused] = useState(false);
//   const [isEmailFocused, setIsEmailFocused] = useState(false);
//   const [userData, setUserData] = useState(null);

//   const autoLoginOtpRef = useRef("");
//   const autoSentNumberRef = useRef("");

//   // Responsive detection with mount fix
//   const [isMobile, setIsMobile] = useState(false);
//   const [isMounted, setIsMounted] = useState(false);
//   const [contentWidth, setContentWidth] = useState(350);
//   const [logoHeight, setLogoHeight] = useState(40);
//   const [verticalSpacing, setVerticalSpacing] = useState(24);

//   // Mount effect - runs once on client
//   useEffect(() => {
//     setIsMounted(true);
//     const handleResize = () => {
//       const width = window.innerWidth;
//       const mobile = width < 768;
//       setIsMobile(mobile);
//       setContentWidth(mobile ? window.innerWidth : 350);
//       setLogoHeight(mobile ? 32 : 40);
//       setVerticalSpacing(mobile ? 16 : 24);
//     };

//     handleResize();
//     window.addEventListener("resize", handleResize);
//     return () => window.removeEventListener("resize", handleResize);
//   }, []);

//   // Update error message when Redux error changes
//   useEffect(() => {
//     if (error) {
//       setErrorMessage(
//         typeof error === "string"
//           ? error
//           : error.message || "An error occurred",
//       );
//     }
//   }, [error]);

//   // Update OTP step when OTP is sent
//   useEffect(() => {
//     if (otpSent) {
//       setIsOtpStep(true);
//       startResendTimer();
//     }
//   }, [otpSent]);

//   // Timer for resend OTP functionality
//   useEffect(() => {
//     let timer;
//     if (showResendTimer && resendSeconds > 0) {
//       timer = setTimeout(() => {
//         setResendSeconds(resendSeconds - 1);
//       }, 1000);
//     }

//     return () => clearTimeout(timer);
//   }, [showResendTimer, resendSeconds]);

//   const startResendTimer = () => {
//     setResendSeconds(120);
//     setShowResendTimer(true);
//   };

//   const handleMobileChange = (value) => {
//     const digitsOnly = value.replace(/\D/g, "").slice(0, 10);
//     setMobileNumber(digitsOnly);

//     if (isOtpStep) {
//       setOtpValues(["", "", "", ""]);
//       setIsOtpStep(false);
//       setErrorMessage(null);
//       setIsOtpVerified(false);
//       dispatch(resetOtpState());
//     }

//     autoLoginOtpRef.current = "";

//     if (digitsOnly.length < 10) {
//       autoSentNumberRef.current = "";
//       return;
//     }

//     if (
//       digitsOnly.length === 10 &&
//       !isLoading &&
//       !isOtpStep &&
//       autoSentNumberRef.current !== digitsOnly
//     ) {
//       autoSentNumberRef.current = digitsOnly;
//       handleSendOtp(digitsOnly);
//     }
//   };

//   const handleOtpChange = (index, value) => {
//     const digitsOnly = value.replace(/\D/g, "").slice(0, 1);
//     const newOtpValues = [...otpValues];
//     newOtpValues[index] = digitsOnly;
//     setOtpValues(newOtpValues);

//     if (digitsOnly && index < 3) {
//       const nextInput = document.getElementById(`otp-${index + 1}`);
//       nextInput?.focus();
//     } else if (!digitsOnly && index > 0) {
//       const prevInput = document.getElementById(`otp-${index - 1}`);
//       prevInput?.focus();
//     }

//     const otp = newOtpValues.join("");
//     const isComplete = newOtpValues.every((val) => val.length === 1);

//     if (isComplete) {
//       setIsOtpVerified(true);
//       setErrorMessage(null);

//       if (
//         isOtpStep &&
//         !isLoading &&
//         mobileNumber.length === 10 &&
//         autoLoginOtpRef.current !== otp
//       ) {
//         autoLoginOtpRef.current = otp;
//         handleLogin(otp);
//       }
//     } else {
//       setIsOtpVerified(false);
//       autoLoginOtpRef.current = "";
//     }
//   };

//   const handleSendOtp = async (number) => {
//     if (!number || number.length !== 10) {
//       setErrorMessage("Please enter a valid 10-digit mobile number");
//       return;
//     }

//     try {
//       setErrorMessage(null);
//       dispatch(clearError());

//       const result = await dispatch(sendOtp(number)).unwrap();

//       setSuccessMessage("OTP has been Sent Successfully");

//       setTimeout(() => {
//         setSuccessMessage(null);
//       }, 3000);
//     } catch (error) {
//       setErrorMessage(
//         typeof error === "string"
//           ? error
//           : error.message || "Failed to send OTP. Please try again.",
//       );
//     }
//   };

//   const handleResendOtp = async (number) => {
//     if (!number || number.length !== 10) {
//       setErrorMessage("Please enter a valid 10-digit mobile number");
//       return;
//     }

//     try {
//       setErrorMessage(null);
//       dispatch(clearError());
//       dispatch(resetOtpState());
//       autoLoginOtpRef.current = "";

//       setResendSeconds(120);
//       await dispatch(sendOtp(number)).unwrap();

//       setSuccessMessage("OTP has been Sent Successfully");
//       setTimeout(() => {
//         setSuccessMessage(null);
//       }, 3000);
//     } catch (error) {
//       setErrorMessage(
//         typeof error === "string"
//           ? error
//           : error.message || "Failed to resend OTP. Please try again.",
//       );
//     }
//   };

//   const handleLogin = async (otpOverride) => {
//     const otp = otpOverride ?? otpValues.join("");
//     if (otp.length !== 4) {
//       setErrorMessage("Please enter complete OTP");
//       return;
//     }

//     try {
//       setErrorMessage(null);
//       dispatch(clearError());

//       const fcmToken = "";
//       const result = await dispatch(
//         verifyOtp({ mobileNumber, otp, fcmToken }),
//       ).unwrap();

//       setSuccessMessage("OTP Verified");
//       setTimeout(() => setSuccessMessage(null), 2000);

//       if (result.data?.token || result.token) {
//         const token = result.data?.token || result.token;
//         localStorage.setItem("token", token);
//       }

//       const user = result.data?.user || result.user;
//       if (user) {
//         localStorage.setItem("user", JSON.stringify(user));
//         setUserData(user);
//         if (typeof window !== "undefined") {
//           window.dispatchEvent(new Event("userLoggedIn"));
//         }
//       }

//       try {
//         const profileResult = await dispatch(getUserProfile()).unwrap();
//         if (profileResult.user || profileResult) {
//           const fetchedProfile = profileResult.user || profileResult;
//           const completeUser = {
//             ...fetchedProfile,
//             id: user.id || fetchedProfile.id || fetchedProfile._id,
//             mobile: user.mobile || fetchedProfile.mobile,
//             role: user.role || fetchedProfile.role,
//           };
//           localStorage.setItem("user", JSON.stringify(completeUser));
//           setUserData(completeUser);
//         }
//       } catch (profileError) {}

//       if (result.data?.isNewUser || result.isNewUser) {
//         setIsNewUserStep(true);
//         return;
//       }

//       setTimeout(() => router.push("/"), 500);
//     } catch (error) {
//       setErrorMessage(
//         typeof error === "string"
//           ? error
//           : error.message || "Login failed. Please try again.",
//       );
//       setIsOtpVerified(false);
//       autoLoginOtpRef.current = "";
//     }
//   };

//   const handleSaveProfile = async () => {
//     if (!fullName.trim()) {
//       setErrorMessage("Please enter your full name");
//       return;
//     }
//     if (!email.trim()) {
//       setErrorMessage("Please enter your email address");
//       return;
//     }

//     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//     if (!emailRegex.test(email)) {
//       setErrorMessage("Please enter a valid email address");
//       return;
//     }

//     if (!userData) {
//       setErrorMessage("User data not found. Please try logging in again.");
//       return;
//     }

//     const userId = userData.id || userData._id || userData.userId;

//     if (!userId) {
//       setErrorMessage("User ID not found. Please try logging in again.");
//       return;
//     }

//     try {
//       setErrorMessage(null);
//       dispatch(clearError());

//       const profilePayload = {
//         id: userId,
//         name: fullName,
//         email: email,
//         mobile: userData.mobile || mobileNumber,
//         role: userData.role || "user",
//       };

//       const response = await dispatch(
//         updateUserProfile(profilePayload),
//       ).unwrap();

//       try {
//         const profileResult = await dispatch(getUserProfile()).unwrap();
//         if (profileResult.user || profileResult) {
//           const completeUser = profileResult.user || profileResult;
//           localStorage.setItem("user", JSON.stringify(completeUser));
//         }
//       } catch (profileError) {
//         const updatedUser = {
//           ...userData,
//           name: fullName,
//           email: email,
//         };
//         localStorage.setItem("user", JSON.stringify(updatedUser));
//       }

//       setTimeout(() => {
//         router.push("/");
//       }, 500);
//     } catch (error) {
//       setErrorMessage(
//         typeof error === "string"
//           ? error
//           : error.message || "Failed to save profile. Please try again.",
//       );
//     }
//   };

//   const formatTime = (seconds) => {
//     const minutes = Math.floor(seconds / 60);
//     const remainingSeconds = seconds % 60;
//     return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
//   };

//   const containerHeight = isMobile ? 52 : 45;
//   const fontSize = 14;
//   const otpFieldWidth = isMobile ? 56 : 68;
//   const otpFieldHeight = isMobile ? 52 : 45;
//   const spacingBetweenFields = isMobile ? 10 : 10;
//   const buttonHeight = isMobile ? 52 : 45;

//   // Don't render anything until mounted to prevent hydration mismatch and flash
//   if (!isMounted) {
//     return null;
//   }

//   return (
//     <div className={isMobile ? "min-h-screen bg-white" : "h-screen flex flex-row"}>
//       {/* Left Side - Login Image (Desktop only) */}
//       {!isMobile && (
//         <div className="w-1/2 h-full relative">
//           <Image
//             src="/images/login/login_image.png"
//             alt="Login"
//             fill
//             className="object-cover"
//             priority
//           />
//         </div>
//       )}

//       {/* Right Side - Login Form */}
//       <div
//         className={isMobile ? "w-full min-h-screen" : "w-1/2 h-full"}
//         style={{ backgroundColor: "#FFFFFF" }}
//       >
//         {/* Success Message - Top Center */}
//         {successMessage && (
//           <div
//             className="fixed left-1/2 transform -translate-x-1/2 z-50"
//             style={{
//               top: isMobile ? "16px" : "20px",
//               animation: "fadeIn 0.3s ease-in-out",
//               width: "auto",
//               maxWidth: isMobile ? "calc(100% - 32px)" : "310px",
//             }}
//           >
//             <div
//               className="flex items-center justify-center"
//               style={{
//                 backgroundColor:
//                   successMessage === "OTP Verified" ? "#45A735" : "#242424",
//                 borderRadius: "40px",
//                 boxShadow: "none",
//                 padding: isMobile ? "10px 20px" : "12px 20px",
//                 whiteSpace: "nowrap",
//               }}
//             >
//               <span
//                 style={{
//                   fontSize: isMobile ? "12px" : "14px",
//                   fontWeight: 400,
//                   color: "#FFFFFF",
//                   fontFamily: "'OpenSauceOne', sans-serif",
//                   textAlign: "center",
//                 }}
//               >
//                 {successMessage}
//               </span>
//             </div>
//           </div>
//         )}

//         {/* Skip Button - Top Right */}
//         {!isNewUserStep && (
//           <div
//             className="absolute"
//             style={{
//               top: isMobile ? "16px" : "30px",
//               right: isMobile ? "16px" : "20px",
//               zIndex: 10,
//             }}
//           >
//             <button
//               onClick={() => router.push("/")}
//               className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors hover:bg-gray-100"
//               style={{
//                 padding: "8px 16px",
//                 borderRadius: "8px",
//               }}
//             >
//               <span
//                 style={{
//                   fontSize: isMobile ? "14px" : "15px",
//                   fontWeight: 700,
//                   color: "#45A735",
//                   display: "inline-flex",
//                   alignItems: "center",
//                 }}
//               >
//                 Skip
//                 <Image
//                   src="/ArrowLeft.svg"
//                   alt="arrow"
//                   width={16}
//                   height={16}
//                   style={{
//                     marginLeft: "6px",
//                     verticalAlign: "middle",
//                     transform: "rotate(45deg)",
//                   }}
//                 />
//               </span>
//             </button>
//           </div>
//         )}

//         {/* Login Form Content */}
//         <div
//           className={isMobile ? "px-5 py-8 flex items-center justify-center min-h-screen" : "flex items-center justify-center h-full"}
//         >
//           <div
//             className="w-full"
//             style={{
//               maxWidth: isMobile ? "100%" : "400px",
//               margin: "0 auto",
//             }}
//           >
//             <div className="flex flex-col items-center">
//               <div className="w-full">
//                 {/* QuickHire Logo */}
//                 <div
//                   style={{
//                     height: `${logoHeight}px`,
//                     marginBottom: isMobile ? "32px" : `${verticalSpacing}px`,
//                     textAlign: isMobile ? "center" : "left",
//                   }}
//                 >
//                   <Image
//                     src="/quickhire-logo.svg"
//                     alt="QuickHire"
//                     width={logoHeight * 3}
//                     height={logoHeight}
//                     className="h-auto"
//                     style={{
//                       height: `${logoHeight}px`,
//                       width: "auto",
//                       margin: isMobile ? "0 auto" : "0"
//                     }}
//                   />
//                 </div>

//                 {/* Conditional Rendering: New User Profile or Login Form */}
//                 {isNewUserStep ? (
//                   <>
//                     {/* Welcome Text */}
//                     <div style={{ marginBottom: "16px" }}>
//                       <h2
//                         style={{
//                           fontSize: "24px",
//                           fontWeight: "600",
//                           color: "#1A1A1A",
//                           textAlign: isMobile ? "center" : "left",
//                         }}
//                       >
//                         Welcome to QuickHire
//                       </h2>
//                     </div>

//                     {/* Subtitle */}
//                     <p
//                       style={{
//                         fontSize: "14px",
//                         fontWeight: "400",
//                         color: "#666666",
//                         fontFamily: "'OpenSauceOne', sans-serif",
//                         marginBottom: isMobile ? "16px" : "20px",
//                         textAlign: isMobile ? "center" : "left",
//                       }}
//                     >
//                       We want to know more about you
//                     </p>

//                     {/* Divider line */}
//                     <div
//                       style={{
//                         width: "100%",
//                         borderBottom: "1px solid #E5E5E5",
//                         marginBottom: isMobile ? "20px" : "24px",
//                       }}
//                     />

//                     {/* Error message display */}
//                     {errorMessage && errorMessage !== "" && (
//                       <div
//                         className="flex items-start gap-3"
//                         style={{
//                           width: "100%",
//                           padding: "12px 16px",
//                           marginBottom: isMobile ? "16px" : "20px",
//                           backgroundColor: "#E74C3C",
//                           borderRadius: "24px",
//                         }}
//                       >
//                         <div
//                           className="text-white flex-shrink-0"
//                           style={{ fontSize: "20px", marginTop: "2px" }}
//                         >
//                           ⚠️
//                         </div>
//                         <span
//                           className="text-white flex-1"
//                           style={{
//                             fontSize: "13px",
//                             color: "#FFFFFF",
//                             fontFamily: "'OpenSauceOne', sans-serif",
//                             lineHeight: 1.4,
//                           }}
//                         >
//                           {errorMessage}
//                         </span>
//                       </div>
//                     )}

//                     {/* Full Name Field */}
//                     <div style={{ marginBottom: `${verticalSpacing}px` }}>
//                       <div style={{ marginBottom: isMobile ? "8px" : "12px" }}>
//                         <span
//                           style={{
//                             fontSize: "12px",
//                             fontWeight: "500",
//                             color: "#1A1A1A",
//                           }}
//                         >
//                           Full Name <span style={{ color: "#DC3545" }}>*</span>
//                         </span>
//                       </div>
//                       <div
//                         style={{
//                           width: "100%",
//                           height: `${containerHeight}px`,
//                           backgroundColor: "#FFFFFF",
//                           borderRadius: "12px",
//                           border: `1px solid ${isFullNameFocused ? "#45A735" : "#E5E5E5"}`,
//                         }}
//                       >
//                         <input
//                           type="text"
//                           value={fullName}
//                           onChange={(e) => setFullName(e.target.value)}
//                           onFocus={() => setIsFullNameFocused(true)}
//                           onBlur={() => setIsFullNameFocused(false)}
//                           placeholder="Enter your full name"
//                           className="w-full h-full bg-transparent outline-none"
//                           style={{
//                             fontSize: `${fontSize}px`,
//                             color: "#484848",
//                             fontFamily: "'OpenSauceOne', sans-serif",
//                             paddingLeft: isMobile ? "16px" : "16px",
//                             paddingRight: isMobile ? "16px" : "16px",
//                             paddingTop: "12px",
//                             paddingBottom: "12px",
//                             borderRadius: "12px",
//                           }}
//                         />
//                       </div>
//                     </div>

//                     {/* Email Address Field */}
//                     <div style={{ marginBottom: `${verticalSpacing}px` }}>
//                       <div style={{ marginBottom: isMobile ? "8px" : "12px" }}>
//                         <span
//                           style={{
//                             fontSize: "12px",
//                             fontWeight: "500",
//                             color: "#1A1A1A",
//                           }}
//                         >
//                           Email Address{" "}
//                           <span style={{ color: "#DC3545" }}>*</span>
//                         </span>
//                       </div>
//                       <div
//                         style={{
//                           width: "100%",
//                           height: `${containerHeight}px`,
//                           backgroundColor: "#FFFFFF",
//                           borderRadius: "12px",
//                           border: `1px solid ${isEmailFocused ? "#45A735" : "#E5E5E5"}`,
//                         }}
//                       >
//                         <input
//                           type="email"
//                           value={email}
//                           onChange={(e) => setEmail(e.target.value)}
//                           onFocus={() => setIsEmailFocused(true)}
//                           onBlur={() => setIsEmailFocused(false)}
//                           placeholder="example@gmail.com"
//                           className="w-full h-full bg-transparent outline-none"
//                           style={{
//                             fontSize: `${fontSize}px`,
//                             color: "#484848",
//                             fontFamily: "'OpenSauceOne', sans-serif",
//                             paddingLeft: isMobile ? "16px" : "16px",
//                             paddingRight: isMobile ? "16px" : "16px",
//                             paddingTop: "12px",
//                             paddingBottom: "12px",
//                             borderRadius: "12px",
//                           }}
//                         />
//                       </div>
//                     </div>
//                   </>
//                 ) : (
//                   <>
//                     {/* Welcome Text - Visible on mobile now */}
//                     <div style={{ marginBottom: "16px" }}>
//                       <h2
//                         style={{
//                           fontSize: isMobile ? "22px" : "24px",
//                           fontWeight: "600",
//                           color: "#1A1A1A",
//                           textAlign: isMobile ? "center" : "left",
//                         }}
//                       >
//                         Welcome to Quick Hire
//                       </h2>
//                     </div>

//                     {/* Subtitle */}
//                     <p
//                       style={{
//                         fontSize: "14px",
//                         fontWeight: "400",
//                         color: "#666666",
//                         fontFamily: "'OpenSauceOne', sans-serif",
//                         marginBottom: isMobile ? "16px" : "20px",
//                         textAlign: isMobile ? "center" : "left",
//                       }}
//                     >
//                       Sign in to hire verified IT professionals instantly.
//                     </p>

//                     {/* Divider line */}
//                     <div
//                       style={{
//                         width: "100%",
//                         borderBottom: "1px solid #E5E5E5",
//                         marginBottom: isMobile ? "20px" : "24px",
//                       }}
//                     />

//                     {/* Error message display */}
//                     {errorMessage && errorMessage !== "" && (
//                       <div
//                         className="flex items-start gap-3"
//                         style={{
//                           width: "100%",
//                           padding: "12px 16px",
//                           marginBottom: isMobile ? "16px" : "20px",
//                           backgroundColor: "#FF48481A",
//                           borderRadius: "12px",
//                           border: "1px solid #FF4848",
//                         }}
//                       >
//                         <span
//                           className="flex-1"
//                           style={{
//                             fontSize: "14px",
//                             color: "#FF4848",
//                             fontFamily: "'OpenSauceOne', sans-serif",
//                             textAlign: "center",
//                           }}
//                         >
//                           {errorMessage}
//                         </span>
//                       </div>
//                     )}

//                     {/* Mobile Number Section */}
//                     <div style={{ marginBottom: `${verticalSpacing}px` }}>
//                       {/* Mobile Number Label */}
//                       <div style={{ marginBottom: isMobile ? "8px" : "12px" }}>
//                         <span
//                           style={{
//                             fontSize: "12px",
//                             fontWeight: "500",
//                             color: "#1A1A1A",
//                           }}
//                         >
//                           Mobile Number{" "}
//                           <span style={{ color: "#DC3545" }}>*</span>
//                         </span>
//                       </div>

//                       {/* Mobile Number Input */}
//                       <div
//                         className="flex"
//                         style={{
//                           width: "100%",
//                           height: `${containerHeight}px`,
//                           backgroundColor: "#FFFFFF",
//                           borderRadius: "12px",
//                           border: `1px solid ${isMobileFocused ? "#45A735" : "#E5E5E5"}`,
//                         }}
//                       >
//                         <div className="flex-1 flex items-center">
//                           <input
//                             type="tel"
//                             value={mobileNumber}
//                             onChange={(e) => handleMobileChange(e.target.value)}
//                             onFocus={() => setIsMobileFocused(true)}
//                             onBlur={() => setIsMobileFocused(false)}
//                             placeholder="Enter Mobile Number"
//                             className="w-full h-full bg-transparent outline-none"
//                             style={{
//                               fontSize: `${fontSize}px`,
//                               color: "#484848",
//                               fontFamily: "'OpenSauceOne', sans-serif",
//                               paddingLeft: isMobile ? "16px" : "16px",
//                               paddingRight: "12px",
//                               paddingTop: "12px",
//                               paddingBottom: "12px",
//                             }}
//                             maxLength={10}
//                           />
//                         </div>

//                         {/* Send OTP Button */}
//                         <div
//                           className="flex items-center"
//                           style={{
//                             height: `${containerHeight}px`,
//                             padding: isMobile ? "2px" : "4px",
//                           }}
//                         >
//                           <button
//                             onClick={() =>
//                               mobileNumber.length === 10 &&
//                               handleSendOtp(mobileNumber)
//                             }
//                             disabled={isLoading || isOtpStep}
//                             className="px-4 py-2 transition-colors"
//                             style={{
//                               fontSize: `${fontSize}px`,
//                               fontWeight: 500,
//                               color: "#45A735",
//                               fontFamily: "'OpenSauceOne', sans-serif",
//                               backgroundColor: "transparent",
//                               border: "none",
//                               cursor:
//                                 isLoading || isOtpStep
//                                   ? "not-allowed"
//                                   : "pointer",
//                               opacity: isLoading || isOtpStep ? 0.6 : 1,
//                               padding: isMobile ? "12px 16px" : "16px 24px",
//                               borderRadius: "12px",
//                             }}
//                           >
//                             {isOtpVerified
//                               ? "OTP Verified"
//                               : isLoading
//                                 ? "Verifying"
//                                 : isOtpStep
//                                   ? "OTP Sent"
//                                   : "Send OTP"}
//                           </button>
//                         </div>
//                       </div>
//                     </div>

//                     {/* OTP Section */}
//                     <div style={{ marginBottom: `${verticalSpacing}px` }}>
//                       {/* OTP Label */}
//                       <div style={{ marginBottom: isMobile ? "8px" : "12px" }}>
//                         <span
//                           style={{
//                             fontSize: "12px",
//                             fontWeight: "500",
//                             color: "#1A1A1A",
//                           }}
//                         >
//                           OTP <span style={{ color: "#DC3545" }}>*</span>
//                         </span>
//                       </div>

//                       {/* OTP Input Row */}
//                       <div className="flex items-center justify-center">
//                         {otpValues.map((value, index) => (
//                           <div key={index} className="flex items-center">
//                             <div
//                               style={{
//                                 width: `${otpFieldWidth}px`,
//                                 height: `${otpFieldHeight}px`,
//                                 backgroundColor: "#FFFFFF",
//                                 borderRadius: "12px",
//                                 border: `1px solid ${
//                                   errorMessage && isOtpStep
//                                     ? "#DC3545"
//                                     : isOtpFocused[index]
//                                       ? "#45A735"
//                                       : "#D9D9D9"
//                                 }`,
//                               }}
//                             >
//                               <input
//                                 id={`otp-${index}`}
//                                 type="text"
//                                 value={value}
//                                 onChange={(e) =>
//                                   handleOtpChange(index, e.target.value)
//                                 }
//                                 onFocus={() => {
//                                   const newFocused = [...isOtpFocused];
//                                   newFocused[index] = true;
//                                   setIsOtpFocused(newFocused);
//                                 }}
//                                 onBlur={() => {
//                                   const newFocused = [...isOtpFocused];
//                                   newFocused[index] = false;
//                                   setIsOtpFocused(newFocused);
//                                 }}
//                                 placeholder="-"
//                                 className="w-full h-full bg-transparent outline-none text-center"
//                                 style={{
//                                   fontSize: "18px",
//                                   fontWeight: "500",
//                                   color: "#1A1A1A",
//                                   fontFamily: "'OpenSauceOne', sans-serif",
//                                 }}
//                                 maxLength={1}
//                                 disabled={!isOtpStep}
//                               />
//                             </div>

//                             {index < 3 && (
//                               <>
//                                 <div style={{ width: `${spacingBetweenFields}px` }} />
//                                 <div
//                                   style={{
//                                     width: isMobile ? "6px" : "8px",
//                                     height: isMobile ? "6px" : "8px",
//                                     backgroundColor: "#CCCCCC",
//                                     borderRadius: "50%",
//                                   }}
//                                 />
//                                 <div style={{ width: `${spacingBetweenFields}px` }} />
//                               </>
//                             )}
//                           </div>
//                         ))}
//                       </div>

//                       {/* Resend OTP Section */}
//                       {showResendTimer &&
//                         !errorMessage?.toLowerCase().includes("locked") &&
//                         !errorMessage
//                           ?.toLowerCase()
//                           .includes("attempts exceeded") && (
//                           <div
//                             className="flex items-center justify-between mt-4"
//                             style={{ marginTop: isMobile ? 16 : 20 }}
//                           >
//                             <span
//                               style={{
//                                 fontSize: "12px",
//                                 fontWeight: 400,
//                                 color: "#666666",
//                                 fontFamily: "'OpenSauceOne', sans-serif",
//                               }}
//                             >
//                               Did not receive OTP yet?
//                             </span>
//                             <div className="flex items-center gap-2">
//                               <Image
//                                 src="/resendicon.svg"
//                                 alt="check"
//                                 width={20}
//                                 height={20}
//                               />
//                               {resendSeconds === 0 ? (
//                                 <button
//                                   onClick={() => handleResendOtp(mobileNumber)}
//                                   className="text-green-600 font-medium"
//                                   style={{
//                                     fontSize: "12px",
//                                     fontWeight: 500,
//                                     color: "#45A735",
//                                     fontFamily: "'OpenSauceOne', sans-serif",
//                                     cursor: "pointer",
//                                     background: "none",
//                                     border: "none",
//                                   }}
//                                 >
//                                   Resend
//                                 </button>
//                               ) : (
//                                 <div className="flex items-center">
//                                   <span
//                                     style={{
//                                       fontSize: "12px",
//                                       fontWeight: 500,
//                                       color: "#45A735",
//                                       fontFamily: "'OpenSauceOne', sans-serif",
//                                     }}
//                                   >
//                                     {formatTime(resendSeconds)}
//                                   </span>
//                                 </div>
//                               )}
//                             </div>
//                           </div>
//                         )}
//                     </div>
//                   </>
//                 )}

//                 {/* Divider line */}
//                 <div
//                   style={{
//                     width: "100%",
//                     height: "1px",
//                     borderBottom: "1px solid #E5E5E5",
//                     marginBottom: `${verticalSpacing}px`,
//                   }}
//                 />
//               </div>

//               {/* Action Button */}
//               <div
//                 style={{
//                   width: "100%",
//                   height: `${buttonHeight}px`,
//                   marginTop: isMobile ? "8px" : "0",
//                 }}
//               >
//                 {isLoading ? (
//                   <div
//                     className="flex items-center justify-center w-full h-full"
//                     style={{
//                       backgroundColor: "rgba(69, 167, 53, 0.5)",
//                       borderRadius: "12px",
//                     }}
//                   >
//                     <div
//                       className="animate-spin rounded-full border-2 border-white border-t-transparent"
//                       style={{
//                         width: "24px",
//                         height: "24px",
//                         borderWidth: "2px",
//                       }}
//                     />
//                   </div>
//                 ) : (
//                   <button
//                     onClick={isNewUserStep ? handleSaveProfile : handleLogin}
//                     disabled={
//                       isNewUserStep
//                         ? !fullName.trim() || !email.trim()
//                         : !isOtpVerified
//                     }
//                     className="w-full h-full transition-colors"
//                     style={{
//                       backgroundColor: (
//                         isNewUserStep
//                           ? fullName.trim() && email.trim()
//                           : isOtpVerified
//                       )
//                         ? "#45A735"
//                         : "rgba(69, 167, 53, 0.5)",
//                       borderRadius: "12px",
//                       padding: isMobile ? "0 20px" : "0 24px",
//                       cursor: (
//                         isNewUserStep
//                           ? fullName.trim() && email.trim()
//                           : isOtpVerified
//                       )
//                         ? "pointer"
//                         : "not-allowed",
//                       border: "none",
//                     }}
//                   >
//                     <span
//                       style={{
//                         fontSize: isMobile ? "16px" : "16px",
//                         fontWeight: 500,
//                         color: "#FFFFFF",
//                         fontFamily: "'OpenSauceOne', sans-serif",
//                       }}
//                     >
//                       {isNewUserStep ? "Save and continue" : "Login"}
//                     </span>
//                   </button>
//                 )}
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default LoginPage;

// 3rd screen issue fix

// "use client";

// import { useState, useEffect, useRef } from "react";
// import { useRouter } from "next/navigation";
// import { useDispatch, useSelector } from "react-redux";
// import {
//   sendOtp,
//   verifyOtp,
//   clearError,
//   resetOtpState,
// } from "@/lib/redux/slices/authSlice/authSlice";
// import {
//   getUserProfile,
//   updateUserProfile,
// } from "@/lib/redux/slices/userProfileSlice/userProfileSlice";
// import Image from "next/image";

// const LoginPage = () => {
//   const router = useRouter();
//   const dispatch = useDispatch();
//   const { isLoading, error, otpSent } = useSelector((state) => state.auth);

//   const [isOtpStep, setIsOtpStep] = useState(false);
//   const [errorMessage, setErrorMessage] = useState(null);
//   const [successMessage, setSuccessMessage] = useState(null);
//   const [mobileNumber, setMobileNumber] = useState("");
//   const [otpValues, setOtpValues] = useState(["", "", "", ""]);
//   const [isOtpVerified, setIsOtpVerified] = useState(false);
//   const [showResendTimer, setShowResendTimer] = useState(false);
//   const [resendSeconds, setResendSeconds] = useState(120);
//   const [isMobileFocused, setIsMobileFocused] = useState(false);
//   const [isOtpFocused, setIsOtpFocused] = useState([
//     false,
//     false,
//     false,
//     false,
//   ]);

//   // New user profile states
//   const [isNewUserStep, setIsNewUserStep] = useState(false);
//   const [fullName, setFullName] = useState("");
//   const [email, setEmail] = useState("");
//   const [isFullNameFocused, setIsFullNameFocused] = useState(false);
//   const [isEmailFocused, setIsEmailFocused] = useState(false);
//   const [userData, setUserData] = useState(null);

//   const autoLoginOtpRef = useRef("");
//   const autoSentNumberRef = useRef("");

//   // Responsive detection with multiple breakpoints
//   const [screenSize, setScreenSize] = useState({
//     isMobile: false,
//     isTablet: false,
//     isDesktop: true,
//     width: 0,
//   });
//   const [isMounted, setIsMounted] = useState(false);
//   const [contentWidth, setContentWidth] = useState(400);
//   const [logoHeight, setLogoHeight] = useState(40);
//   const [verticalSpacing, setVerticalSpacing] = useState(24);

//   // Mount effect - runs once on client
//   useEffect(() => {
//     setIsMounted(true);
//     const handleResize = () => {
//       const width = window.innerWidth;
//       const isMobile = width < 640;
//       const isTablet = width >= 640 && width < 1024;
//       const isDesktop = width >= 1024;

//       setScreenSize({
//         isMobile,
//         isTablet,
//         isDesktop,
//         width,
//       });

//       // Adjust content width based on screen size
//       if (isMobile) {
//         setContentWidth(width - 40);
//         setLogoHeight(32);
//         setVerticalSpacing(16);
//       } else if (isTablet) {
//         setContentWidth(400);
//         setLogoHeight(36);
//         setVerticalSpacing(20);
//       } else {
//         setContentWidth(400);
//         setLogoHeight(40);
//         setVerticalSpacing(24);
//       }
//     };

//     handleResize();
//     window.addEventListener("resize", handleResize);
//     return () => window.removeEventListener("resize", handleResize);
//   }, []);

//   // Update error message when Redux error changes
//   useEffect(() => {
//     if (error) {
//       setErrorMessage(
//         typeof error === "string"
//           ? error
//           : error.message || "An error occurred",
//       );
//     }
//   }, [error]);

//   // Update OTP step when OTP is sent
//   useEffect(() => {
//     if (otpSent) {
//       setIsOtpStep(true);
//       startResendTimer();
//     }
//   }, [otpSent]);

//   // Timer for resend OTP functionality
//   useEffect(() => {
//     let timer;
//     if (showResendTimer && resendSeconds > 0) {
//       timer = setTimeout(() => {
//         setResendSeconds(resendSeconds - 1);
//       }, 1000);
//     }

//     return () => clearTimeout(timer);
//   }, [showResendTimer, resendSeconds]);

//   const startResendTimer = () => {
//     setResendSeconds(120);
//     setShowResendTimer(true);
//   };

//   const handleMobileChange = (value) => {
//     const digitsOnly = value.replace(/\D/g, "").slice(0, 10);
//     setMobileNumber(digitsOnly);

//     if (isOtpStep) {
//       setOtpValues(["", "", "", ""]);
//       setIsOtpStep(false);
//       setErrorMessage(null);
//       setIsOtpVerified(false);
//       dispatch(resetOtpState());
//     }

//     autoLoginOtpRef.current = "";

//     if (digitsOnly.length < 10) {
//       autoSentNumberRef.current = "";
//       return;
//     }

//     if (
//       digitsOnly.length === 10 &&
//       !isLoading &&
//       !isOtpStep &&
//       autoSentNumberRef.current !== digitsOnly
//     ) {
//       autoSentNumberRef.current = digitsOnly;
//       handleSendOtp(digitsOnly);
//     }
//   };

//   const handleOtpChange = (index, value) => {
//     const digitsOnly = value.replace(/\D/g, "").slice(0, 1);
//     const newOtpValues = [...otpValues];
//     newOtpValues[index] = digitsOnly;
//     setOtpValues(newOtpValues);

//     if (digitsOnly && index < 3) {
//       const nextInput = document.getElementById(`otp-${index + 1}`);
//       nextInput?.focus();
//     } else if (!digitsOnly && index > 0) {
//       const prevInput = document.getElementById(`otp-${index - 1}`);
//       prevInput?.focus();
//     }

//     const otp = newOtpValues.join("");
//     const isComplete = newOtpValues.every((val) => val.length === 1);

//     if (isComplete) {
//       setIsOtpVerified(true);
//       setErrorMessage(null);

//       if (
//         isOtpStep &&
//         !isLoading &&
//         mobileNumber.length === 10 &&
//         autoLoginOtpRef.current !== otp
//       ) {
//         autoLoginOtpRef.current = otp;
//         handleLogin(otp);
//       }
//     } else {
//       setIsOtpVerified(false);
//       autoLoginOtpRef.current = "";
//     }
//   };

//   const handleSendOtp = async (number) => {
//     if (!number || number.length !== 10) {
//       setErrorMessage("Please enter a valid 10-digit mobile number");
//       return;
//     }

//     try {
//       setErrorMessage(null);
//       dispatch(clearError());

//       const result = await dispatch(sendOtp(number)).unwrap();

//       setSuccessMessage("OTP has been Sent Successfully");

//       setTimeout(() => {
//         setSuccessMessage(null);
//       }, 3000);
//     } catch (error) {
//       setErrorMessage(
//         typeof error === "string"
//           ? error
//           : error.message || "Failed to send OTP. Please try again.",
//       );
//     }
//   };

//   const handleResendOtp = async (number) => {
//     if (!number || number.length !== 10) {
//       setErrorMessage("Please enter a valid 10-digit mobile number");
//       return;
//     }

//     try {
//       setErrorMessage(null);
//       dispatch(clearError());
//       dispatch(resetOtpState());
//       autoLoginOtpRef.current = "";

//       setResendSeconds(120);
//       await dispatch(sendOtp(number)).unwrap();

//       setSuccessMessage("OTP has been Sent Successfully");
//       setTimeout(() => {
//         setSuccessMessage(null);
//       }, 3000);
//     } catch (error) {
//       setErrorMessage(
//         typeof error === "string"
//           ? error
//           : error.message || "Failed to resend OTP. Please try again.",
//       );
//     }
//   };

//   const handleLogin = async (otpOverride) => {
//     const otp = otpOverride ?? otpValues.join("");
//     if (otp.length !== 4) {
//       setErrorMessage("Please enter complete OTP");
//       return;
//     }

//     try {
//       setErrorMessage(null);
//       dispatch(clearError());

//       const fcmToken = "";
//       const result = await dispatch(
//         verifyOtp({ mobileNumber, otp, fcmToken }),
//       ).unwrap();

//       setSuccessMessage("OTP Verified");
//       setTimeout(() => setSuccessMessage(null), 2000);

//       if (result.data?.token || result.token) {
//         const token = result.data?.token || result.token;
//         localStorage.setItem("token", token);
//       }

//       const user = result.data?.user || result.user;
//       if (user) {
//         localStorage.setItem("user", JSON.stringify(user));
//         setUserData(user);
//         if (typeof window !== "undefined") {
//           window.dispatchEvent(new Event("userLoggedIn"));
//         }
//       }

//       try {
//         const profileResult = await dispatch(getUserProfile()).unwrap();
//         if (profileResult.user || profileResult) {
//           const fetchedProfile = profileResult.user || profileResult;
//           const completeUser = {
//             ...fetchedProfile,
//             id: user.id || fetchedProfile.id || fetchedProfile._id,
//             mobile: user.mobile || fetchedProfile.mobile,
//             role: user.role || fetchedProfile.role,
//           };
//           localStorage.setItem("user", JSON.stringify(completeUser));
//           setUserData(completeUser);
//         }
//       } catch (profileError) {}

//       if (result.data?.isNewUser || result.isNewUser) {
//         setIsNewUserStep(true);
//         return;
//       }

//       setTimeout(() => router.push("/"), 500);
//     } catch (error) {
//       setErrorMessage(
//         typeof error === "string"
//           ? error
//           : error.message || "Login failed. Please try again.",
//       );
//       setIsOtpVerified(false);
//       autoLoginOtpRef.current = "";
//     }
//   };

//   const handleSaveProfile = async () => {
//     if (!fullName.trim()) {
//       setErrorMessage("Please enter your full name");
//       return;
//     }
//     if (!email.trim()) {
//       setErrorMessage("Please enter your email address");
//       return;
//     }

//     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//     if (!emailRegex.test(email)) {
//       setErrorMessage("Please enter a valid email address");
//       return;
//     }

//     if (!userData) {
//       setErrorMessage("User data not found. Please try logging in again.");
//       return;
//     }

//     const userId = userData.id || userData._id || userData.userId;

//     if (!userId) {
//       setErrorMessage("User ID not found. Please try logging in again.");
//       return;
//     }

//     try {
//       setErrorMessage(null);
//       dispatch(clearError());

//       const profilePayload = {
//         id: userId,
//         name: fullName,
//         email: email,
//         mobile: userData.mobile || mobileNumber,
//         role: userData.role || "user",
//       };

//       const response = await dispatch(
//         updateUserProfile(profilePayload),
//       ).unwrap();

//       try {
//         const profileResult = await dispatch(getUserProfile()).unwrap();
//         if (profileResult.user || profileResult) {
//           const completeUser = profileResult.user || profileResult;
//           localStorage.setItem("user", JSON.stringify(completeUser));
//         }
//       } catch (profileError) {
//         const updatedUser = {
//           ...userData,
//           name: fullName,
//           email: email,
//         };
//         localStorage.setItem("user", JSON.stringify(updatedUser));
//       }

//       setTimeout(() => {
//         router.push("/");
//       }, 500);
//     } catch (error) {
//       setErrorMessage(
//         typeof error === "string"
//           ? error
//           : error.message || "Failed to save profile. Please try again.",
//       );
//     }
//   };

//   const formatTime = (seconds) => {
//     const minutes = Math.floor(seconds / 60);
//     const remainingSeconds = seconds % 60;
//     return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
//   };

//   // Responsive values based on screen size
//   const getResponsiveValues = () => {
//     if (screenSize.isMobile) {
//       return {
//         containerHeight: 52,
//         fontSize: 14,
//         otpFieldWidth: 56,
//         otpFieldHeight: 52,
//         spacingBetweenFields: 10,
//         buttonHeight: 52,
//         logoMarginBottom: 32,
//         contentPadding: "20px",
//         titleSize: "22px",
//         buttonFontSize: "16px",
//         otpInputFontSize: "18px",
//         dotSize: 6,
//       };
//     } else if (screenSize.isTablet) {
//       return {
//         containerHeight: 50,
//         fontSize: 14,
//         otpFieldWidth: 60,
//         otpFieldHeight: 50,
//         spacingBetweenFields: 12,
//         buttonHeight: 50,
//         logoMarginBottom: 28,
//         contentPadding: "24px",
//         titleSize: "24px",
//         buttonFontSize: "16px",
//         otpInputFontSize: "18px",
//         dotSize: 7,
//       };
//     } else {
//       return {
//         containerHeight: 45,
//         fontSize: 14,
//         otpFieldWidth: 68,
//         otpFieldHeight: 45,
//         spacingBetweenFields: 10,
//         buttonHeight: 45,
//         logoMarginBottom: 24,
//         contentPadding: "16px",
//         titleSize: "24px",
//         buttonFontSize: "16px",
//         otpInputFontSize: "16px",
//         dotSize: 8,
//       };
//     }
//   };

//   const responsive = getResponsiveValues();

//   // Don't render anything until mounted to prevent hydration mismatch and flash
//   if (!isMounted) {
//     return null;
//   }

//   const { isMobile, isTablet, isDesktop } = screenSize;

//   return (
//     <div
//       className={isDesktop ? "h-screen flex flex-row" : "min-h-screen bg-white"}
//     >
//       {/* Left Side - Login Image (Desktop only) */}
//       {isDesktop && (
//         <div className="w-1/2 h-full relative">
//           <Image
//             src="/images/login/login_image.png"
//             alt="Login"
//             fill
//             className="object-cover"
//             priority
//           />
//         </div>
//       )}

//       {/* Right Side - Login Form */}
//       <div
//         className={isDesktop ? "w-1/2 h-full" : "w-full min-h-screen"}
//         style={{ backgroundColor: "#FFFFFF" }}
//       >
//         {/* Success Message - Top Center */}
//         {successMessage && (
//           <div
//             className="fixed left-1/2 transform -translate-x-1/2 z-50"
//             style={{
//               top: isMobile ? "16px" : "20px",
//               animation: "fadeIn 0.3s ease-in-out",
//               width: "auto",
//               maxWidth: isMobile ? "calc(100% - 32px)" : "310px",
//             }}
//           >
//             <div
//               className="flex items-center justify-center"
//               style={{
//                 backgroundColor:
//                   successMessage === "OTP Verified" ? "#45A735" : "#242424",
//                 borderRadius: "40px",
//                 boxShadow: "none",
//                 padding: isMobile ? "10px 20px" : "12px 20px",
//                 whiteSpace: "nowrap",
//               }}
//             >
//               <span
//                 style={{
//                   fontSize: isMobile ? "12px" : "14px",
//                   fontWeight: 400,
//                   color: "#FFFFFF",
//                   fontFamily: "'OpenSauceOne', sans-serif",
//                   textAlign: "center",
//                 }}
//               >
//                 {successMessage}
//               </span>
//             </div>
//           </div>
//         )}

//         {/* Skip Button - Top Right */}
//         {!isNewUserStep && (
//           <div
//             className="absolute"
//             style={{
//               top: isMobile ? "16px" : "30px",
//               right: isMobile ? "16px" : "20px",
//               zIndex: 10,
//             }}
//           >
//             <button
//               onClick={() => router.push("/")}
//               className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors hover:bg-gray-100"
//               style={{
//                 padding: "8px 16px",
//                 borderRadius: "8px",
//               }}
//             >
//               <span
//                 style={{
//                   fontSize: isMobile ? "14px" : "15px",
//                   fontWeight: 700,
//                   color: "#45A735",
//                   display: "inline-flex",
//                   alignItems: "center",
//                 }}
//               >
//                 Skip
//                 <Image
//                   src="/ArrowLeft.svg"
//                   alt="arrow"
//                   width={16}
//                   height={16}
//                   style={{
//                     marginLeft: "6px",
//                     verticalAlign: "middle",
//                     transform: "rotate(45deg)",
//                   }}
//                 />
//               </span>
//             </button>
//           </div>
//         )}

//         {/* Login Form Content */}
//         <div
//           className={
//             isMobile
//               ? "px-5 py-8 flex items-center justify-center min-h-screen"
//               : "flex items-center justify-center min-h-screen"
//           }
//           style={{
//             padding: isTablet ? "32px 24px" : undefined,
//           }}
//         >
//           <div
//             className="w-full"
//             style={{
//               maxWidth: isMobile ? "100%" : isTablet ? "500px" : "400px",
//               margin: "0 auto",
//             }}
//           >
//             <div className="flex flex-col items-center">
//               <div className="w-full">
//                 {/* QuickHire Logo */}
//                 <div
//                   style={{
//                     height: `${logoHeight}px`,
//                     marginBottom: `${responsive.logoMarginBottom}px`,
//                     textAlign: isMobile ? "center" : "center",
//                   }}
//                 >
//                   <Image
//                     src="/quickhire-logo.svg"
//                     alt="QuickHire"
//                     width={logoHeight * 3}
//                     height={logoHeight}
//                     className="h-auto"
//                     style={{
//                       height: `${logoHeight}px`,
//                       width: "auto",
//                       margin: "0 auto",
//                     }}
//                   />
//                 </div>

//                 {/* Conditional Rendering: New User Profile or Login Form */}
//                 {isNewUserStep ? (
//                   <>
//                     {/* Welcome Text */}
//                     <div style={{ marginBottom: "16px" }}>
//                       <h2
//                         style={{
//                           fontSize: responsive.titleSize,
//                           fontWeight: "600",
//                           color: "#1A1A1A",
//                           textAlign: "center",
//                         }}
//                       >
//                         Welcome to QuickHire
//                       </h2>
//                     </div>

//                     {/* Subtitle */}
//                     <p
//                       style={{
//                         fontSize: "14px",
//                         fontWeight: "400",
//                         color: "#666666",
//                         fontFamily: "'OpenSauceOne', sans-serif",
//                         marginBottom: isMobile ? "16px" : "20px",
//                         textAlign: "center",
//                       }}
//                     >
//                       We want to know more about you
//                     </p>

//                     {/* Divider line */}
//                     <div
//                       style={{
//                         width: "100%",
//                         borderBottom: "1px solid #E5E5E5",
//                         marginBottom: isMobile ? "20px" : "24px",
//                       }}
//                     />

//                     {/* Error message display */}
//                     {errorMessage && errorMessage !== "" && (
//                       <div
//                         className="flex items-start gap-3"
//                         style={{
//                           width: "100%",
//                           padding: "12px 16px",
//                           marginBottom: isMobile ? "16px" : "20px",
//                           backgroundColor: "#E74C3C",
//                           borderRadius: "24px",
//                         }}
//                       >
//                         <div
//                           className="text-white flex-shrink-0"
//                           style={{ fontSize: "20px", marginTop: "2px" }}
//                         >
//                           ⚠️
//                         </div>
//                         <span
//                           className="text-white flex-1"
//                           style={{
//                             fontSize: "13px",
//                             color: "#FFFFFF",
//                             fontFamily: "'OpenSauceOne', sans-serif",
//                             lineHeight: 1.4,
//                           }}
//                         >
//                           {errorMessage}
//                         </span>
//                       </div>
//                     )}

//                     {/* Full Name Field */}
//                     <div style={{ marginBottom: `${verticalSpacing}px` }}>
//                       <div style={{ marginBottom: isMobile ? "8px" : "12px" }}>
//                         <span
//                           style={{
//                             fontSize: "12px",
//                             fontWeight: "500",
//                             color: "#1A1A1A",
//                           }}
//                         >
//                           Full Name <span style={{ color: "#DC3545" }}>*</span>
//                         </span>
//                       </div>
//                       <div
//                         style={{
//                           width: "100%",
//                           height: `${responsive.containerHeight}px`,
//                           backgroundColor: "#FFFFFF",
//                           borderRadius: "12px",
//                           border: `1px solid ${isFullNameFocused ? "#45A735" : "#E5E5E5"}`,
//                         }}
//                       >
//                         <input
//                           type="text"
//                           value={fullName}
//                           onChange={(e) => setFullName(e.target.value)}
//                           onFocus={() => setIsFullNameFocused(true)}
//                           onBlur={() => setIsFullNameFocused(false)}
//                           placeholder="Enter your full name"
//                           className="w-full h-full bg-transparent outline-none"
//                           style={{
//                             fontSize: `${responsive.fontSize}px`,
//                             color: "#484848",
//                             fontFamily: "'OpenSauceOne', sans-serif",
//                             paddingLeft: isMobile ? "16px" : "16px",
//                             paddingRight: isMobile ? "16px" : "16px",
//                             paddingTop: "12px",
//                             paddingBottom: "12px",
//                             borderRadius: "12px",
//                           }}
//                         />
//                       </div>
//                     </div>

//                     {/* Email Address Field */}
//                     <div style={{ marginBottom: `${verticalSpacing}px` }}>
//                       <div style={{ marginBottom: isMobile ? "8px" : "12px" }}>
//                         <span
//                           style={{
//                             fontSize: "12px",
//                             fontWeight: "500",
//                             color: "#1A1A1A",
//                           }}
//                         >
//                           Email Address{" "}
//                           <span style={{ color: "#DC3545" }}>*</span>
//                         </span>
//                       </div>
//                       <div
//                         style={{
//                           width: "100%",
//                           height: `${responsive.containerHeight}px`,
//                           backgroundColor: "#FFFFFF",
//                           borderRadius: "12px",
//                           border: `1px solid ${isEmailFocused ? "#45A735" : "#E5E5E5"}`,
//                         }}
//                       >
//                         <input
//                           type="email"
//                           value={email}
//                           onChange={(e) => setEmail(e.target.value)}
//                           onFocus={() => setIsEmailFocused(true)}
//                           onBlur={() => setIsEmailFocused(false)}
//                           placeholder="example@gmail.com"
//                           className="w-full h-full bg-transparent outline-none"
//                           style={{
//                             fontSize: `${responsive.fontSize}px`,
//                             color: "#484848",
//                             fontFamily: "'OpenSauceOne', sans-serif",
//                             paddingLeft: isMobile ? "16px" : "16px",
//                             paddingRight: isMobile ? "16px" : "16px",
//                             paddingTop: "12px",
//                             paddingBottom: "12px",
//                             borderRadius: "12px",
//                           }}
//                         />
//                       </div>
//                     </div>
//                   </>
//                 ) : (
//                   <>
//                     {/* Welcome Text */}
//                     <div style={{ marginBottom: "16px" }}>
//                       <h2
//                         style={{
//                           fontSize: responsive.titleSize,
//                           fontWeight: "600",
//                           color: "#1A1A1A",
//                           textAlign: "center",
//                         }}
//                       >
//                         Welcome to Quick Hire
//                       </h2>
//                     </div>

//                     {/* Subtitle */}
//                     <p
//                       style={{
//                         fontSize: "14px",
//                         fontWeight: "400",
//                         color: "#666666",
//                         fontFamily: "'OpenSauceOne', sans-serif",
//                         marginBottom: isMobile ? "16px" : "20px",
//                         textAlign: "center",
//                       }}
//                     >
//                       Sign in to hire verified IT professionals instantly.
//                     </p>

//                     {/* Divider line */}
//                     <div
//                       style={{
//                         width: "100%",
//                         borderBottom: "1px solid #E5E5E5",
//                         marginBottom: isMobile ? "20px" : "24px",
//                       }}
//                     />

//                     {/* Error message display */}
//                     {errorMessage && errorMessage !== "" && (
//                       <div
//                         className="flex items-start gap-3"
//                         style={{
//                           width: "100%",
//                           padding: "12px 16px",
//                           marginBottom: isMobile ? "16px" : "20px",
//                           backgroundColor: "#FF48481A",
//                           borderRadius: "12px",
//                           border: "1px solid #FF4848",
//                         }}
//                       >
//                         <span
//                           className="flex-1"
//                           style={{
//                             fontSize: "14px",
//                             color: "#FF4848",
//                             fontFamily: "'OpenSauceOne', sans-serif",
//                             textAlign: "center",
//                           }}
//                         >
//                           {errorMessage}
//                         </span>
//                       </div>
//                     )}

//                     {/* Mobile Number Section */}
//                     <div style={{ marginBottom: `${verticalSpacing}px` }}>
//                       {/* Mobile Number Label */}
//                       <div style={{ marginBottom: isMobile ? "8px" : "12px" }}>
//                         <span
//                           style={{
//                             fontSize: "12px",
//                             fontWeight: "500",
//                             color: "#1A1A1A",
//                           }}
//                         >
//                           Mobile Number{" "}
//                           <span style={{ color: "#DC3545" }}>*</span>
//                         </span>
//                       </div>

//                       {/* Mobile Number Input */}
//                       <div
//                         className="flex"
//                         style={{
//                           width: "100%",
//                           height: `${responsive.containerHeight}px`,
//                           backgroundColor: "#FFFFFF",
//                           borderRadius: "12px",
//                           border: `1px solid ${isMobileFocused ? "#45A735" : "#E5E5E5"}`,
//                         }}
//                       >
//                         <div className="flex-1 flex items-center">
//                           <input
//                             type="tel"
//                             value={mobileNumber}
//                             onChange={(e) => handleMobileChange(e.target.value)}
//                             onFocus={() => setIsMobileFocused(true)}
//                             onBlur={() => setIsMobileFocused(false)}
//                             placeholder="Enter Mobile Number"
//                             className="w-full h-full bg-transparent outline-none"
//                             style={{
//                               fontSize: `${responsive.fontSize}px`,
//                               color: "#484848",
//                               fontFamily: "'OpenSauceOne', sans-serif",
//                               paddingLeft: isMobile ? "16px" : "16px",
//                               paddingRight: "12px",
//                               paddingTop: "12px",
//                               paddingBottom: "12px",
//                             }}
//                             maxLength={10}
//                           />
//                         </div>

//                         {/* Send OTP Button */}
//                         <div
//                           className="flex items-center"
//                           style={{
//                             height: `${responsive.containerHeight}px`,
//                             padding: isMobile ? "2px" : "4px",
//                           }}
//                         >
//                           <button
//                             onClick={() =>
//                               mobileNumber.length === 10 &&
//                               handleSendOtp(mobileNumber)
//                             }
//                             disabled={isLoading || isOtpStep}
//                             className="px-4 py-2 transition-colors"
//                             style={{
//                               fontSize: `${responsive.fontSize}px`,
//                               fontWeight: 500,
//                               color: "#45A735",
//                               fontFamily: "'OpenSauceOne', sans-serif",
//                               backgroundColor: "transparent",
//                               border: "none",
//                               cursor:
//                                 isLoading || isOtpStep
//                                   ? "not-allowed"
//                                   : "pointer",
//                               opacity: isLoading || isOtpStep ? 0.6 : 1,
//                               padding: isMobile ? "12px 16px" : "16px 24px",
//                               borderRadius: "12px",
//                             }}
//                           >
//                             {isOtpVerified
//                               ? "OTP Verified"
//                               : isLoading
//                                 ? "Verifying"
//                                 : isOtpStep
//                                   ? "OTP Sent"
//                                   : "Send OTP"}
//                           </button>
//                         </div>
//                       </div>
//                     </div>

//                     {/* OTP Section */}
//                     <div style={{ marginBottom: `${verticalSpacing}px` }}>
//                       {/* OTP Label */}
//                       <div style={{ marginBottom: isMobile ? "8px" : "12px" }}>
//                         <span
//                           style={{
//                             fontSize: "12px",
//                             fontWeight: "500",
//                             color: "#1A1A1A",
//                           }}
//                         >
//                           OTP <span style={{ color: "#DC3545" }}>*</span>
//                         </span>
//                       </div>

//                       {/* OTP Input Row */}
//                       <div className="flex items-center justify-center">
//                         {otpValues.map((value, index) => (
//                           <div key={index} className="flex items-center">
//                             <div
//                               style={{
//                                 width: `${responsive.otpFieldWidth}px`,
//                                 height: `${responsive.otpFieldHeight}px`,
//                                 backgroundColor: "#FFFFFF",
//                                 borderRadius: "12px",
//                                 border: `1px solid ${
//                                   errorMessage && isOtpStep
//                                     ? "#DC3545"
//                                     : isOtpFocused[index]
//                                       ? "#45A735"
//                                       : "#D9D9D9"
//                                 }`,
//                               }}
//                             >
//                               <input
//                                 id={`otp-${index}`}
//                                 type="text"
//                                 value={value}
//                                 onChange={(e) =>
//                                   handleOtpChange(index, e.target.value)
//                                 }
//                                 onFocus={() => {
//                                   const newFocused = [...isOtpFocused];
//                                   newFocused[index] = true;
//                                   setIsOtpFocused(newFocused);
//                                 }}
//                                 onBlur={() => {
//                                   const newFocused = [...isOtpFocused];
//                                   newFocused[index] = false;
//                                   setIsOtpFocused(newFocused);
//                                 }}
//                                 placeholder="-"
//                                 className="w-full h-full bg-transparent outline-none text-center"
//                                 style={{
//                                   fontSize: `${responsive.otpInputFontSize}px`,
//                                   fontWeight: "500",
//                                   color: "#1A1A1A",
//                                   fontFamily: "'OpenSauceOne', sans-serif",
//                                 }}
//                                 maxLength={1}
//                                 disabled={!isOtpStep}
//                               />
//                             </div>

//                             {index < 3 && (
//                               <>
//                                 <div
//                                   style={{
//                                     width: `${responsive.spacingBetweenFields}px`,
//                                   }}
//                                 />
//                                 <div
//                                   style={{
//                                     width: `${responsive.dotSize}px`,
//                                     height: `${responsive.dotSize}px`,
//                                     backgroundColor: "#CCCCCC",
//                                     borderRadius: "50%",
//                                   }}
//                                 />
//                                 <div
//                                   style={{
//                                     width: `${responsive.spacingBetweenFields}px`,
//                                   }}
//                                 />
//                               </>
//                             )}
//                           </div>
//                         ))}
//                       </div>

//                       {/* Resend OTP Section */}
//                       {showResendTimer &&
//                         !errorMessage?.toLowerCase().includes("locked") &&
//                         !errorMessage
//                           ?.toLowerCase()
//                           .includes("attempts exceeded") && (
//                           <div
//                             className="flex items-center justify-between mt-4"
//                             style={{ marginTop: isMobile ? 16 : 20 }}
//                           >
//                             <span
//                               style={{
//                                 fontSize: "12px",
//                                 fontWeight: 400,
//                                 color: "#666666",
//                                 fontFamily: "'OpenSauceOne', sans-serif",
//                               }}
//                             >
//                               Did not receive OTP yet?
//                             </span>
//                             <div className="flex items-center gap-2">
//                               <Image
//                                 src="/resendicon.svg"
//                                 alt="check"
//                                 width={20}
//                                 height={20}
//                               />
//                               {resendSeconds === 0 ? (
//                                 <button
//                                   onClick={() => handleResendOtp(mobileNumber)}
//                                   className="text-green-600 font-medium"
//                                   style={{
//                                     fontSize: "12px",
//                                     fontWeight: 500,
//                                     color: "#45A735",
//                                     fontFamily: "'OpenSauceOne', sans-serif",
//                                     cursor: "pointer",
//                                     background: "none",
//                                     border: "none",
//                                   }}
//                                 >
//                                   Resend
//                                 </button>
//                               ) : (
//                                 <div className="flex items-center">
//                                   <span
//                                     style={{
//                                       fontSize: "12px",
//                                       fontWeight: 500,
//                                       color: "#45A735",
//                                       fontFamily: "'OpenSauceOne', sans-serif",
//                                     }}
//                                   >
//                                     {formatTime(resendSeconds)}
//                                   </span>
//                                 </div>
//                               )}
//                             </div>
//                           </div>
//                         )}
//                     </div>
//                   </>
//                 )}

//                 {/* Divider line */}
//                 <div
//                   style={{
//                     width: "100%",
//                     height: "1px",
//                     borderBottom: "1px solid #E5E5E5",
//                     marginBottom: `${verticalSpacing}px`,
//                   }}
//                 />
//               </div>

//               {/* Action Button */}
//               <div
//                 style={{
//                   width: "100%",
//                   height: `${responsive.buttonHeight}px`,
//                   marginTop: isMobile ? "8px" : "0",
//                 }}
//               >
//                 {isLoading ? (
//                   <div
//                     className="flex items-center justify-center w-full h-full"
//                     style={{
//                       backgroundColor: "rgba(69, 167, 53, 0.5)",
//                       borderRadius: "12px",
//                     }}
//                   >
//                     <div
//                       className="animate-spin rounded-full border-2 border-white border-t-transparent"
//                       style={{
//                         width: "24px",
//                         height: "24px",
//                         borderWidth: "2px",
//                       }}
//                     />
//                   </div>
//                 ) : (
//                   <button
//                     onClick={isNewUserStep ? handleSaveProfile : handleLogin}
//                     disabled={
//                       isNewUserStep
//                         ? !fullName.trim() || !email.trim()
//                         : !isOtpVerified
//                     }
//                     className="w-full h-full transition-colors"
//                     style={{
//                       backgroundColor: (
//                         isNewUserStep
//                           ? fullName.trim() && email.trim()
//                           : isOtpVerified
//                       )
//                         ? "#45A735"
//                         : "rgba(69, 167, 53, 0.5)",
//                       borderRadius: "12px",
//                       padding: isMobile ? "0 20px" : "0 24px",
//                       cursor: (
//                         isNewUserStep
//                           ? fullName.trim() && email.trim()
//                           : isOtpVerified
//                       )
//                         ? "pointer"
//                         : "not-allowed",
//                       border: "none",
//                     }}
//                   >
//                     <span
//                       style={{
//                         fontSize: responsive.buttonFontSize,
//                         fontWeight: 500,
//                         color: "#FFFFFF",
//                         fontFamily: "'OpenSauceOne', sans-serif",
//                       }}
//                     >
//                       {isNewUserStep ? "Save and continue" : "Login"}
//                     </span>
//                   </button>
//                 )}
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default LoginPage;

"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import {
  sendOtp,
  verifyOtp,
  clearError,
  resetOtpState,
} from "@/lib/redux/slices/authSlice/authSlice";
import {
  getUserProfile,
  updateUserProfile,
} from "@/lib/redux/slices/userProfileSlice/userProfileSlice";
import Image from "next/image";

const LoginPage = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const { isLoading, error, otpSent } = useSelector((state) => state.auth);

  const [isOtpStep, setIsOtpStep] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [mobileNumber, setMobileNumber] = useState("");
  const [otpValues, setOtpValues] = useState(["", "", "", ""]);
  const [isOtpVerified, setIsOtpVerified] = useState(false);
  const [showResendTimer, setShowResendTimer] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(120);
  const [isMobileFocused, setIsMobileFocused] = useState(false);
  const [isOtpFocused, setIsOtpFocused] = useState([
    false,
    false,
    false,
    false,
  ]);

  // New user profile states
  const [isNewUserStep, setIsNewUserStep] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [isFullNameFocused, setIsFullNameFocused] = useState(false);
  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [userData, setUserData] = useState(null);

  const autoLoginOtpRef = useRef("");
  const autoSentNumberRef = useRef("");

  // Responsive detection with multiple breakpoints
  const [screenSize, setScreenSize] = useState({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    isIpadPro: false,
    width: 0,
    height: 0,
  });
  const [isMounted, setIsMounted] = useState(false);
  const [contentWidth, setContentWidth] = useState(400);
  const [logoHeight, setLogoHeight] = useState(40);
  const [verticalSpacing, setVerticalSpacing] = useState(24);

  // Mount effect - runs once on client
  useEffect(() => {
    setIsMounted(true);
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      // Detect iPad Pro (1024x1366 or similar resolutions)
      const isIpadPro =
        (width === 1024 && height === 1366) ||
        (width === 1366 && height === 1024) ||
        (width >= 1024 && width <= 1366 && height >= 1024 && height <= 1366);

      const isMobile = width < 768;
      const isTablet = width >= 768 && width < 1024 && !isIpadPro;
      const isDesktop = width >= 1024 && !isIpadPro;

      setScreenSize({
        isMobile,
        isTablet,
        isDesktop,
        isIpadPro,
        width,
        height,
      });

      // Adjust content width based on screen size
      if (isMobile) {
        setContentWidth(width - 40);
        setLogoHeight(32);
        setVerticalSpacing(16);
      } else if (isTablet) {
        setContentWidth(450);
        setLogoHeight(38);
        setVerticalSpacing(20);
      } else if (isIpadPro) {
        setContentWidth(500);
        setLogoHeight(42);
        setVerticalSpacing(24);
      } else {
        setContentWidth(400);
        setLogoHeight(40);
        setVerticalSpacing(24);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Update error message when Redux error changes
  useEffect(() => {
    if (error) {
      setErrorMessage(
        typeof error === "string"
          ? error
          : error.message || "An error occurred",
      );
    }
  }, [error]);

  // Update OTP step when OTP is sent
  useEffect(() => {
    if (otpSent) {
      setIsOtpStep(true);
      startResendTimer();
    }
  }, [otpSent]);

  // Timer for resend OTP functionality
  useEffect(() => {
    let timer;
    if (showResendTimer && resendSeconds > 0) {
      timer = setTimeout(() => {
        setResendSeconds(resendSeconds - 1);
      }, 1000);
    }

    return () => clearTimeout(timer);
  }, [showResendTimer, resendSeconds]);

  const startResendTimer = () => {
    setResendSeconds(120);
    setShowResendTimer(true);
  };

  console.log("📱 isMobile:");

  useEffect(() => {
    setErrorMessage(null); // Clear any existing error messages on mount
    
  }, []);

  // const handleMobileChange = (value) => {
  //   const digitsOnly = value.replace(/\D/g, "").slice(0, 10);
  //   setMobileNumber(digitsOnly);

  //   // Clear OTP fields when mobile number changes (Flutter behavior)
  //   if (isOtpStep) {
  //     setOtpValues(["", "", "", ""]);
  //     setIsOtpStep(false);
  //     setErrorMessage(null);
  //     setIsOtpVerified(false);
  //     dispatch(resetOtpState());
  //   }
  // };

  // 3) replace your handleMobileChange with this
  // update handleMobileChange (reset OTP auto-login guard when number changes)
  const handleMobileChange = (value) => {
    const digitsOnly = value.replace(/\D/g, "").slice(0, 10);
    setMobileNumber(digitsOnly);

    if (isOtpStep) {
      setOtpValues(["", "", "", ""]);
      setIsOtpStep(false);
      setErrorMessage(null);
      setIsOtpVerified(false);
      dispatch(resetOtpState());
    }

    autoLoginOtpRef.current = "";

    if (digitsOnly.length < 10) {
      autoSentNumberRef.current = "";
      return;
    }

    if (
      digitsOnly.length === 10 &&
      !isLoading &&
      !isOtpStep &&
      autoSentNumberRef.current !== digitsOnly
    ) {
      autoSentNumberRef.current = digitsOnly;
      handleSendOtp(digitsOnly);
    }
  };

  const handleOtpChange = (index, value) => {
    const digitsOnly = value.replace(/\D/g, "").slice(0, 1);
    const newOtpValues = [...otpValues];
    newOtpValues[index] = digitsOnly;
    setOtpValues(newOtpValues);

    if (digitsOnly && index < 3) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    } else if (!digitsOnly && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }

    const otp = newOtpValues.join("");
    const isComplete = newOtpValues.every((val) => val.length === 1);

    if (isComplete) {
      setIsOtpVerified(true);
      setErrorMessage(null);

      if (
        isOtpStep &&
        !isLoading &&
        mobileNumber.length === 10 &&
        autoLoginOtpRef.current !== otp
      ) {
        autoLoginOtpRef.current = otp;
        handleLogin(otp);
      }
    } else {
      setIsOtpVerified(false);
      autoLoginOtpRef.current = "";
    }
  };

  const handleSendOtp = async (number) => {
    if (!number || number.length !== 10) {
      setErrorMessage("Please enter a valid 10-digit mobile number");
      return;
    }

    try {
      setErrorMessage(null);
      dispatch(clearError());

      const result = await dispatch(sendOtp(number)).unwrap();

      setSuccessMessage("OTP has been Sent Successfully");

      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (error) {
      setErrorMessage(
        typeof error === "string"
          ? error
          : error.message || "Failed to send OTP. Please try again.",
      );
    }
  };

  const handleResendOtp = async (number) => {
    if (!number || number.length !== 10) {
      setErrorMessage("Please enter a valid 10-digit mobile number");
      return;
    }

    try {
      setErrorMessage(null);
      dispatch(clearError());
      dispatch(resetOtpState());
      autoLoginOtpRef.current = "";

      setResendSeconds(120);
      await dispatch(sendOtp(number)).unwrap();

      setSuccessMessage("OTP has been Sent Successfully");
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (error) {
      setErrorMessage(
        typeof error === "string"
          ? error
          : error.message || "Failed to resend OTP. Please try again.",
      );
    }
  };

  const handleLogin = async (otpOverride) => {
    const otp = otpOverride ?? otpValues.join("");
    if (otp.length !== 4) {
      setErrorMessage("Please enter complete OTP");
      return;
    }

    try {
      setErrorMessage(null);
      dispatch(clearError());

      const fcmToken = "";
      const result = await dispatch(
        verifyOtp({ mobileNumber, otp, fcmToken }),
      ).unwrap();

      setSuccessMessage("OTP Verified");
      setTimeout(() => setSuccessMessage(null), 2000);

      if (result.data?.token || result.token) {
        const token = result.data?.token || result.token;
        localStorage.setItem("token", token);
      }

      const user = result.data?.user || result.user;
      if (user) {
        localStorage.setItem("user", JSON.stringify(user));
        setUserData(user);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("userLoggedIn"));
        }
      }

      try {
        const profileResult = await dispatch(getUserProfile()).unwrap();
        if (profileResult.user || profileResult) {
          const fetchedProfile = profileResult.user || profileResult;
          const completeUser = {
            ...fetchedProfile,
            id: user.id || fetchedProfile.id || fetchedProfile._id,
            mobile: user.mobile || fetchedProfile.mobile,
            role: user.role || fetchedProfile.role,
          };
          localStorage.setItem("user", JSON.stringify(completeUser));
          setUserData(completeUser);
        }
      } catch (profileError) {}

      if (result.data?.isNewUser || result.isNewUser) {
        setIsNewUserStep(true);
        return;
      }

      setTimeout(() => router.push("/"), 500);
    } catch (error) {
      setErrorMessage(
        typeof error === "string"
          ? error
          : error.message || "Login failed. Please try again.",
      );
      setIsOtpVerified(false);
      autoLoginOtpRef.current = "";
    }
  };

  const handleSaveProfile = async () => {
    if (!fullName.trim()) {
      setErrorMessage("Please enter your full name");
      return;
    }
    if (!email.trim()) {
      setErrorMessage("Please enter your email address");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setErrorMessage("Please enter a valid email address");
      return;
    }

    if (!userData) {
      setErrorMessage("User data not found. Please try logging in again.");
      return;
    }

    const userId = userData.id || userData._id || userData.userId;

    if (!userId) {
      setErrorMessage("User ID not found. Please try logging in again.");
      return;
    }

    try {
      setErrorMessage(null);
      dispatch(clearError());

      const profilePayload = {
        id: userId,
        name: fullName,
        email: email,
        mobile: userData.mobile || mobileNumber,
        role: userData.role || "user",
      };

      const response = await dispatch(
        updateUserProfile(profilePayload),
      ).unwrap();

      try {
        const profileResult = await dispatch(getUserProfile()).unwrap();
        if (profileResult.user || profileResult) {
          const completeUser = profileResult.user || profileResult;
          localStorage.setItem("user", JSON.stringify(completeUser));
        }
      } catch (profileError) {
        const updatedUser = {
          ...userData,
          name: fullName,
          email: email,
        };
        localStorage.setItem("user", JSON.stringify(updatedUser));
      }

      setTimeout(() => {
        router.push("/");
      }, 500);
    } catch (error) {
      setErrorMessage(
        typeof error === "string"
          ? error
          : error.message || "Failed to save profile. Please try again.",
      );
    }
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  // Responsive values based on screen size
  const getResponsiveValues = () => {
    if (screenSize.isMobile) {
      return {
        containerHeight: 52,
        fontSize: 14,
        otpFieldWidth: 56,
        otpFieldHeight: 52,
        spacingBetweenFields: 10,
        buttonHeight: 52,
        logoMarginBottom: 32,
        contentPadding: "20px",
        titleSize: "22px",
        buttonFontSize: "16px",
        otpInputFontSize: "18px",
        dotSize: 6,
        maxWidth: "100%",
        formPadding: "20px",
      };
    } else if (screenSize.isTablet) {
      return {
        containerHeight: 52,
        fontSize: 15,
        otpFieldWidth: 62,
        otpFieldHeight: 52,
        spacingBetweenFields: 12,
        buttonHeight: 52,
        logoMarginBottom: 32,
        contentPadding: "24px",
        titleSize: "26px",
        buttonFontSize: "17px",
        otpInputFontSize: "20px",
        dotSize: 7,
        maxWidth: "550px",
        formPadding: "32px",
      };
    } else if (screenSize.isIpadPro) {
      return {
        containerHeight: 56,
        fontSize: 16,
        otpFieldWidth: 70,
        otpFieldHeight: 56,
        spacingBetweenFields: 14,
        buttonHeight: 56,
        logoMarginBottom: 40,
        contentPadding: "32px",
        titleSize: "28px",
        buttonFontSize: "18px",
        otpInputFontSize: "22px",
        dotSize: 8,
        maxWidth: "600px",
        formPadding: "40px",
      };
    } else {
      return {
        containerHeight: 45,
        fontSize: 14,
        otpFieldWidth: 68,
        otpFieldHeight: 45,
        spacingBetweenFields: 10,
        buttonHeight: 45,
        logoMarginBottom: 24,
        contentPadding: "16px",
        titleSize: "24px",
        buttonFontSize: "16px",
        otpInputFontSize: "16px",
        dotSize: 8,
        maxWidth: "400px",
        formPadding: "16px",
      };
    }
  };

  const responsive = getResponsiveValues();

  // Don't render anything until mounted to prevent hydration mismatch and flash
  if (!isMounted) {
    return null;
  }

  const { isMobile, isTablet, isDesktop, isIpadPro } = screenSize;

  // For iPad Pro and larger tablets, show a centered form without sidebar
  const showSidebar = isDesktop && !isIpadPro;
  const isFullWidthForm = isMobile || isTablet || isIpadPro;

  return (
    <div
      className={
        showSidebar
          ? "h-screen flex flex-row"
          : "min-h-screen bg-white flex items-center justify-center"
      }
    >
      {/* Left Side - Login Image (Desktop only - not for iPad Pro) */}
      {showSidebar && (
        <div className="w-1/2 h-full relative">
          <Image
            src="/images/login/login_image.png"
            alt="Login"
            fill
            className="object-cover"
            priority
          />
        </div>
      )}

      {/* Right Side - Login Form */}
      <div
        className={showSidebar ? "w-1/2 h-full" : "w-full"}
        style={{ backgroundColor: "#FFFFFF" }}
      >
        {/* Success Message - Top Center */}
        {/* {successMessage && (
          <div
            className="fixed left-1/2 transform -translate-x-1/2 z-50"
            style={{
              top: isMobile ? "16px" : "20px",
              animation: "fadeIn 0.3s ease-in-out",
              width: "auto",
              maxWidth: isMobile ? "calc(100% - 32px)" : "310px",
            }}
          >
            <div
              className="flex items-center justify-center"
              style={{
                backgroundColor:
                  successMessage === "OTP Verified" ? "#45A735" : "#242424",
                borderRadius: "40px",
                boxShadow: "none",
                padding: isMobile ? "10px 20px" : "12px 20px",
                whiteSpace: "nowrap",
              }}
            > */}

               {successMessage && (
          <div
            className={isMobile ? "fixed left-1/2 transform -translate-x-1/2 z-50" : "fixed z-50"}
            style={{
              top: isMobile ? "16px" : isIpadPro ? "24px" : "30px",
              right: isMobile ? "auto" : isIpadPro ? "24px" : "250px",
              left: isMobile ? "50%" : "auto",
              transform: isMobile ? "translateX(-50%)" : "none",
              animation: "fadeIn 0.3s ease-in-out",
              width: "auto",
              maxWidth: isMobile ? "calc(100% - 32px)" : "310px",
            }}
          >
            <div
              className="flex items-center justify-center"
              style={{
                backgroundColor:
                  successMessage === "OTP Verified" ? "#45A735" : "#242424",
                borderRadius: "40px",
                boxShadow: "none",
                padding: isMobile ? "10px 20px" : "12px 20px",
                whiteSpace: "nowrap",
              }}
            >
              <span
                style={{
                  fontSize: isMobile ? "12px" : "14px",
                  fontWeight: 400,
                  color: "#FFFFFF",
                  fontFamily: "'OpenSauceOne', sans-serif",
                  textAlign: "center",
                }}
              >
                {successMessage}
              </span>
            </div>
          </div>
        )}

        {/* Skip Button - Top Right */}
        {!isNewUserStep && (
          <div
            className="absolute"
            style={{
              top: isMobile ? "16px" : isIpadPro ? "24px" : "30px",
              right: isMobile ? "16px" : isIpadPro ? "24px" : "20px",
              zIndex: 10,
            }}
          >
            <button
              onClick={() => router.push("/")}
              className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors hover:bg-gray-100"
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
              }}
            >
              <span
                style={{
                  fontSize: isMobile ? "14px" : isIpadPro ? "16px" : "15px",
                  fontWeight: 700,
                  color: "#45A735",
                  display: "inline-flex",
                  alignItems: "center",
                }}
              >
                Skip
                <Image
                  src="/ArrowLeft.svg"
                  alt="arrow"
                  width={16}
                  height={16}
                  style={{
                    marginLeft: "6px",
                    verticalAlign: "middle",
                    transform: "rotate(45deg)",
                  }}
                />
              </span>
            </button>
          </div>
        )}

        {/* Login Form Content */}
        <div
          className="flex items-center justify-center min-h-screen"
          style={{
            padding: isIpadPro ? "40px" : isMobile ? "20px" : "32px",
          }}
        >
          <div
            className="w-full"
            style={{
              maxWidth: responsive.maxWidth,
              margin: "0 auto",
            }}
          >
            <div className="flex flex-col items-center">
              <div className="w-full">
                {/* QuickHire Logo */}
                <div
                  style={{
                    height: `${logoHeight}px`,
                    marginBottom: `${responsive.logoMarginBottom}px`,
                    textAlign: "center",
                  }}
                >
                  <Image
                    src="/quickhire-logo.svg"
                    alt="QuickHire"
                    width={logoHeight * 3}
                    height={logoHeight}
                    className="h-auto"
                    style={{
                      height: `${logoHeight}px`,
                      width: "auto",
                      margin: "0 auto",
                    }}
                  />
                </div>

                {/* Conditional Rendering: New User Profile or Login Form */}
                {isNewUserStep ? (
                  <>
                    {/* Welcome Text */}
                    <div style={{ marginBottom: "16px" }}>
                      <h2
                        style={{
                          fontSize: responsive.titleSize,
                          fontWeight: "600",
                          color: "#1A1A1A",
                          textAlign: "center",
                        }}
                      >
                        Welcome to QuickHire
                      </h2>
                    </div>

                    {/* Subtitle */}
                    <p
                      style={{
                        fontSize: isIpadPro ? "16px" : "14px",
                        fontWeight: "400",
                        color: "#666666",
                        fontFamily: "'OpenSauceOne', sans-serif",
                        marginBottom: isMobile ? "16px" : "20px",
                        textAlign: "center",
                      }}
                    >
                      We want to know more about you
                    </p>

                    {/* Divider line */}
                    <div
                      style={{
                        width: "100%",
                        borderBottom: "1px solid #E5E5E5",
                        marginBottom: isMobile ? "20px" : "24px",
                      }}
                    />

                    {/* Error message display */}
                    {errorMessage && errorMessage !== "" && (
                      <div
                        className="flex items-start gap-3"
                        style={{
                          width: "100%",
                          padding: "12px 16px",
                          marginBottom: isMobile ? "16px" : "20px",
                          backgroundColor: "#E74C3C",
                          borderRadius: "24px",
                        }}
                      >
                        <div
                          className="text-white flex-shrink-0"
                          style={{ fontSize: "20px", marginTop: "2px" }}
                        >
                          ⚠️
                        </div>
                        <span
                          className="text-white flex-1"
                          style={{
                            fontSize: isIpadPro ? "14px" : "13px",
                            color: "#FFFFFF",
                            fontFamily: "'OpenSauceOne', sans-serif",
                            lineHeight: 1.4,
                          }}
                        >
                          {errorMessage}
                        </span>
                      </div>
                    )}

                    {/* Full Name Field */}
                    <div style={{ marginBottom: `${verticalSpacing}px` }}>
                      <div style={{ marginBottom: isMobile ? "8px" : "12px" }}>
                        <span
                          style={{
                            fontSize: isIpadPro ? "14px" : "12px",
                            fontWeight: "500",
                            color: "#1A1A1A",
                          }}
                        >
                          Full Name <span style={{ color: "#DC3545" }}>*</span>
                        </span>
                      </div>
                      <div
                        style={{
                          width: "100%",
                          height: `${responsive.containerHeight}px`,
                          backgroundColor: "#FFFFFF",
                          borderRadius: "12px",
                          border: `1px solid ${isFullNameFocused ? "#45A735" : "#E5E5E5"}`,
                        }}
                      >
                        <input
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          onFocus={() => setIsFullNameFocused(true)}
                          onBlur={() => setIsFullNameFocused(false)}
                          placeholder="Enter your full name"
                          className="w-full h-full bg-transparent outline-none"
                          style={{
                            fontSize: `${responsive.fontSize}px`,
                            color: "#484848",
                            fontFamily: "'OpenSauceOne', sans-serif",
                            paddingLeft: isMobile ? "16px" : "20px",
                            paddingRight: isMobile ? "16px" : "20px",
                            paddingTop: "12px",
                            paddingBottom: "12px",
                            borderRadius: "12px",
                          }}
                        />
                      </div>
                    </div>

                    {/* Email Address Field */}
                    <div style={{ marginBottom: `${verticalSpacing}px` }}>
                      <div style={{ marginBottom: isMobile ? "8px" : "12px" }}>
                        <span
                          style={{
                            fontSize: isIpadPro ? "14px" : "12px",
                            fontWeight: "500",
                            color: "#1A1A1A",
                          }}
                        >
                          Email Address{" "}
                          <span style={{ color: "#DC3545" }}>*</span>
                        </span>
                      </div>
                      <div
                        style={{
                          width: "100%",
                          height: `${responsive.containerHeight}px`,
                          backgroundColor: "#FFFFFF",
                          borderRadius: "12px",
                          border: `1px solid ${isEmailFocused ? "#45A735" : "#E5E5E5"}`,
                        }}
                      >
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          onFocus={() => setIsEmailFocused(true)}
                          onBlur={() => setIsEmailFocused(false)}
                          placeholder="example@gmail.com"
                          className="w-full h-full bg-transparent outline-none"
                          style={{
                            fontSize: `${responsive.fontSize}px`,
                            color: "#484848",
                            fontFamily: "'OpenSauceOne', sans-serif",
                            paddingLeft: isMobile ? "16px" : "20px",
                            paddingRight: isMobile ? "16px" : "20px",
                            paddingTop: "12px",
                            paddingBottom: "12px",
                            borderRadius: "12px",
                          }}
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Welcome Text */}
                    <div style={{ marginBottom: "16px" }}>
                      <h2
                        style={{
                          fontSize: responsive.titleSize,
                          fontWeight: "600",
                          color: "#1A1A1A",
                          textAlign: "center",
                        }}
                      >
                        Welcome to Quick Hire
                      </h2>
                    </div>

                    {/* Subtitle */}
                    <p
                      style={{
                        fontSize: isIpadPro ? "16px" : "14px",
                        fontWeight: "400",
                        color: "#666666",
                        fontFamily: "'OpenSauceOne', sans-serif",
                        marginBottom: isMobile ? "16px" : "20px",
                        textAlign: "center",
                      }}
                    >
                      Sign in to hire verified IT professionals instantly.
                    </p>

                    {/* Divider line */}
                    <div
                      style={{
                        width: "100%",
                        borderBottom: "1px solid #E5E5E5",
                        marginBottom: isMobile ? "20px" : "24px",
                      }}
                    />

                    {/* Error message display */}
                    {errorMessage && errorMessage !== "" && (
                      <div
                        className="flex items-start gap-3"
                        style={{
                          width: "100%",
                          padding: "12px 16px",
                          marginBottom: isMobile ? "16px" : "20px",
                          backgroundColor: "#FF48481A",
                          borderRadius: "12px",
                          border: "1px solid #FF4848",
                        }}
                      >
                        <span
                          className="flex-1"
                          style={{
                            fontSize: isIpadPro ? "15px" : "14px",
                            color: "#FF4848",
                            fontFamily: "'OpenSauceOne', sans-serif",
                            textAlign: "center",
                          }}
                        >
                          {errorMessage}
                        </span>
                      </div>
                    )}

                    {/* Mobile Number Section */}
                    <div style={{ marginBottom: `${verticalSpacing}px` }}>
                      {/* Mobile Number Label */}
                      <div style={{ marginBottom: isMobile ? "8px" : "12px" }}>
                        <span
                          style={{
                            fontSize: isIpadPro ? "14px" : "12px",
                            fontWeight: "500",
                            color: "#1A1A1A",
                          }}
                        >
                          Mobile Number{" "}
                          <span style={{ color: "#DC3545" }}>*</span>
                        </span>
                      </div>

                      {/* Mobile Number Input */}
                      <div
                        className="flex"
                        style={{
                          width: "100%",
                          height: `${responsive.containerHeight}px`,
                          backgroundColor: "#FFFFFF",
                          borderRadius: "12px",
                          border: `1px solid ${isMobileFocused ? "#45A735" : "#E5E5E5"}`,
                        }}
                      >
                        <div className="flex-1 flex items-center">
                          <input
                            type="tel"
                            value={mobileNumber}
                            onChange={(e) => handleMobileChange(e.target.value)}
                            onFocus={() => setIsMobileFocused(true)}
                            onBlur={() => setIsMobileFocused(false)}
                            placeholder="Enter Mobile Number"
                            className="w-full h-full bg-transparent outline-none"
                            style={{
                              fontSize: `${responsive.fontSize}px`,
                              color: "#484848",
                              fontFamily: "'OpenSauceOne', sans-serif",
                              paddingLeft: isMobile ? "16px" : "20px",
                              paddingRight: "12px",
                              paddingTop: "12px",
                              paddingBottom: "12px",
                            }}
                            maxLength={10}
                          />
                        </div>

                        {/* Send OTP Button */}
                        <div
                          className="flex items-center"
                          style={{
                            height: `${responsive.containerHeight}px`,
                            padding: isMobile ? "2px" : "4px",
                          }}
                        >
                          <button
                            onClick={() =>
                              mobileNumber.length === 10 &&
                              handleSendOtp(mobileNumber)
                            }
                            disabled={isLoading || isOtpStep}
                            className="px-4 py-2 transition-colors"
                            style={{
                              fontSize: `${responsive.fontSize}px`,
                              fontWeight: 500,
                              color: "#45A735",
                              fontFamily: "'OpenSauceOne', sans-serif",
                              backgroundColor: "transparent",
                              border: "none",
                              cursor:
                                isLoading || isOtpStep
                                  ? "not-allowed"
                                  : "pointer",
                              opacity: isLoading || isOtpStep ? 0.6 : 1,
                              padding: isMobile ? "12px 16px" : "16px 24px",
                              borderRadius: "12px",
                            }}
                          >
                            {isOtpVerified
                              ? "OTP Verified"
                              : isLoading
                                ? "Verifying"
                                : isOtpStep
                                  ? "OTP Sent"
                                  : "Send OTP"}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* OTP Section */}
                    <div style={{ marginBottom: `${verticalSpacing}px` }}>
                      {/* OTP Label */}
                      <div style={{ marginBottom: isMobile ? "8px" : "12px" }}>
                        <span
                          style={{
                            fontSize: isIpadPro ? "14px" : "12px",
                            fontWeight: "500",
                            color: "#1A1A1A",
                          }}
                        >
                          OTP <span style={{ color: "#DC3545" }}>*</span>
                        </span>
                      </div>

                      {/* OTP Input Row */}
                      <div className="flex items-center justify-center">
                        {otpValues.map((value, index) => (
                          <div key={index} className="flex items-center">
                            <div
                              style={{
                                width: `${responsive.otpFieldWidth}px`,
                                height: `${responsive.otpFieldHeight}px`,
                                backgroundColor: "#FFFFFF",
                                borderRadius: "12px",
                                border: `1px solid ${
                                  errorMessage && isOtpStep
                                    ? "#DC3545"
                                    : isOtpFocused[index]
                                      ? "#45A735"
                                      : "#D9D9D9"
                                }`,
                              }}
                            >
                              <input
                                id={`otp-${index}`}
                                type="text"
                                value={value}
                                onChange={(e) =>
                                  handleOtpChange(index, e.target.value)
                                }
                                onFocus={() => {
                                  const newFocused = [...isOtpFocused];
                                  newFocused[index] = true;
                                  setIsOtpFocused(newFocused);
                                }}
                                onBlur={() => {
                                  const newFocused = [...isOtpFocused];
                                  newFocused[index] = false;
                                  setIsOtpFocused(newFocused);
                                }}
                                placeholder="-"
                                className="w-full h-full bg-transparent outline-none text-center"
                                style={{
                                  fontSize: `${responsive.otpInputFontSize}px`,
                                  fontWeight: "500",
                                  color: "#1A1A1A",
                                  fontFamily: "'OpenSauceOne', sans-serif",
                                }}
                                maxLength={1}
                                disabled={!isOtpStep}
                              />
                            </div>

                            {index < 3 && (
                              <>
                                <div
                                  style={{
                                    width: `${responsive.spacingBetweenFields}px`,
                                  }}
                                />
                                <div
                                  style={{
                                    width: `${responsive.dotSize}px`,
                                    height: `${responsive.dotSize}px`,
                                    backgroundColor: "#CCCCCC",
                                    borderRadius: "50%",
                                  }}
                                />
                                <div
                                  style={{
                                    width: `${responsive.spacingBetweenFields}px`,
                                  }}
                                />
                              </>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Resend OTP Section - exact Flutter implementation */}
                      {showResendTimer && (
                        <div
                          className="flex items-center mt-3"
                          style={{ marginTop: isMobile ? 12 : 16 }}
                        >
                          <span
                            className="flex-1"
                            style={{
                              fontSize: "12px",
                              fontWeight: 400,
                              color: "#484848",
                              fontFamily: "'OpenSauceOne', sans-serif",
                            }}
                          >
                            Did not receive OTP yet?
                          </span>
                          <div className="flex items-center">
                            <Image
                              src="/resendicon.svg"
                              alt="check"
                              width={24}
                              height={24}
                              style={{ marginRight: "8px" }}
                            />
                            {resendSeconds === 0 ? (
                              <button
                                onClick={() => handleResendOtp(mobileNumber)}
                                className="text-green-600 font-medium"
                                style={{
                                  fontSize: "12px",
                                  fontWeight: 400,
                                  color: "#484848",
                                  fontFamily: "'OpenSauceOne', sans-serif",
                                  cursor: "pointer",
                                }}
                              >
                                Resend
                              </button>
                            ) : (
                              <div className="flex items-center">
                                <span
                                  style={{
                                    fontSize: isIpadPro ? "13px" : "12px",
                                    fontWeight: 500,
                                    color: "#45A735",
                                    fontFamily: "'OpenSauceOne', sans-serif",
                                  }}
                                >
                                  Resend{" "}
                                </span>

                                <span
                                  style={{
                                    fontSize: "12px",
                                    fontWeight: 700,
                                    color: "#45A735",
                                    fontFamily: "'OpenSauceOne', sans-serif",
                                    marginLeft: "8px", // Add space between "Resend" and timer
                                  }}
                                >
                                  {formatTime(resendSeconds)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Divider line */}
                <div
                  style={{
                    width: "100%",
                    height: "1px",
                    borderBottom: "1px solid #E5E5E5",
                    marginBottom: `${verticalSpacing}px`,
                  }}
                />
              </div>

              {/* Action Button */}
              <div
                style={{
                  width: "100%",
                  height: `${responsive.buttonHeight}px`,
                  marginTop: isMobile ? "8px" : "0",
                }}
              >
                {isLoading ? (
                  <div
                    className="flex items-center justify-center w-full h-full"
                    style={{
                      backgroundColor: "rgba(69, 167, 53, 0.5)",
                      borderRadius: "12px",
                    }}
                  >
                    <div
                      className="animate-spin rounded-full border-2 border-white border-t-transparent"
                      style={{
                        width: "24px",
                        height: "24px",
                        borderWidth: "2px",
                      }}
                    />
                  </div>
                ) : (
                  <button
                    onClick={isNewUserStep ? handleSaveProfile : handleLogin}
                    disabled={
                      isNewUserStep
                        ? !fullName.trim() || !email.trim()
                        : !isOtpVerified
                    }
                    className="w-full h-full transition-colors"
                    style={{
                      backgroundColor: (
                        isNewUserStep
                          ? fullName.trim() && email.trim()
                          : isOtpVerified
                      )
                        ? "#45A735"
                        : "rgba(69, 167, 53, 0.5)",
                      borderRadius: "12px",
                      padding: isMobile ? "0 20px" : "0 24px",
                      cursor: (
                        isNewUserStep
                          ? fullName.trim() && email.trim()
                          : isOtpVerified
                      )
                        ? "pointer"
                        : "not-allowed",
                      border: "none",
                    }}
                  >
                    <span
                      style={{
                        fontSize: responsive.buttonFontSize,
                        fontWeight: 500,
                        color: "#FFFFFF",
                        fontFamily: "'OpenSauceOne', sans-serif",
                      }}
                    >
                      {isNewUserStep ? "Save and continue" : "Login"}
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
