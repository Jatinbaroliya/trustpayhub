"use client";
import React, { useEffect, useState, useCallback } from "react";
import Script from "next/script";
import { fetchuser, fetchpayments, initiate } from "@/actions/useractions";
import { useSearchParams, useRouter } from "next/navigation";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Bounce } from "react-toastify";
import Image from "next/image";

const PaymentPage = ({ username }) => {
  const [paymentform, setPaymentform] = useState({
    name: "",
    message: "",
    amount: "",
  });
  const [currentUser, setcurrentUser] = useState({});
  const [payments, setPayments] = useState([]);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();

  const getData = useCallback(async () => {
    try {
      console.log("Fetching data for username:", username);
      const u = await fetchuser(username);
      if (u) {
        setcurrentUser(u);
      }
      const dbpayments = await fetchpayments(username);
      if (dbpayments) {
        setPayments(dbpayments);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      const errorMessage = error.message || "Failed to load page data. Please refresh the page.";
      if (typeof window !== "undefined" && window.toast) {
        toast.error(errorMessage);
      }
    }
  }, [username]);

  useEffect(() => {
    console.log("useEffect triggered for getData");
    getData();
  }, [getData]);

  useEffect(() => {
    if (searchParams.get("paymentdone") === "true") {
      toast("Thanks for your donation!", {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "light",
        transition: Bounce,
      });
      // Delay navigation to allow toast to show and data to load
      setTimeout(() => {
        router.push(`/${username}`);
      }, 3000);
    }
  }, [searchParams, router, username]);

  const handleChange = (e) => {
    setPaymentform({ ...paymentform, [e.target.name]: e.target.value });
  };

  const pay = async (amount) => {
    // Get Razorpay Key ID from environment variable or user database
    const razorpayKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || currentUser.razorpayid;
    
    if (!razorpayKeyId) {
      toast.error("Payment gateway not configured. Please contact support.");
      return;
    }

    if (!razorpayLoaded || (typeof window !== "undefined" && !window.Razorpay)) {
      toast.error("Payment gateway is loading. Please try again in a moment.");
      return;
    }

    setPaymentLoading(true);
    try {
      const orderResponse = await initiate(amount, username, paymentform);
      
      if (!orderResponse || !orderResponse.id) {
        throw new Error("Failed to create payment order");
      }

      const orderId = orderResponse.id;
      // Use the key_id from server response to ensure they match
      const razorpayKey = orderResponse.key_id || razorpayKeyId;

      const options = {
        key: razorpayKey,
        amount: amount,
        currency: "INR",
        name: "TrustPayHub",
        description: "Support Transaction",
        image: "https://example.com/your_logo",
        order_id: orderId,
        callback_url: `${process.env.NEXT_PUBLIC_URL || window.location.origin}/api/razorpay`,
        prefill: {
          name: paymentform.name,
          email: "gaurav.kumar@example.com",
          contact: "9000090000",
        },
        notes: {
          address: "TrustPayHub Platform",
        },
        theme: {
          color: "#3399cc",
        },
      };

      const rzp1 = new window.Razorpay(options);
      rzp1.on("payment.failed", function (response) {
        console.error("Payment failed:", response);
        toast.error(`Payment failed: ${response.error?.description || "Please try again."}`);
      });
      rzp1.on("payment.success", function (response) {
        console.log("Payment success:", response);
      });
      rzp1.open();
    } catch (error) {
      console.error("Payment error:", error);
      const errorMessage = error.message || "Payment initiation failed. Please try again.";
      toast.error(errorMessage);
    } finally {
      setPaymentLoading(false);
    }
  };

  return (
    <>
      <ToastContainer theme="light" />
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
        onLoad={() => {
          if (typeof window !== "undefined" && window.Razorpay) {
            setRazorpayLoaded(true);
          }
        }}
        onError={() => {
          toast.error("Failed to load payment gateway. Please refresh the page.");
        }}
      />

      <div className="cover w-full bg-gradient-to-r from-purple-900 via-blue-900 to-pink-900 relative rounded-b-3xl shadow-lg overflow-visible mb-12">
        {currentUser.coverpic && (
          <Image
            src={currentUser.coverpic}
            alt="Cover"
            width={1920}
            height={350}
            className="object-cover w-full h-48 md:h-[350px] opacity-80"
          />
        )}
        {/* profile: half on cover and half below */}
        <div
          className="absolute left-1/2 top-full -translate-x-1/2 -translate-y-1/2 z-30 rounded-full bg-white/30 backdrop-blur-lg flex items-center justify-center"
          style={{ width: 176, height: 176 }}
        >
          {currentUser.profilepic && (
            <Image
              src={currentUser.profilepic}
              alt="Profile"
              width={176}
              height={176}
              className="rounded-full object-cover w-full h-full border-4 border-purple-400 shadow-lg"
            />
          )}
        </div>
      </div>

      <div className="info flex justify-center items-center mt-24 mb-12 flex-col gap-4">
        <div className="font-extrabold text-2xl md:text-3xl text-transparent bg-clip-text bg-gradient-to-r from-purple-500 via-pink-400 to-blue-500 drop-shadow-lg">
          @{username}
        </div>
        <div className="text-slate-400 text-lg">
          Let&apos;s help{" "}
          <span className="font-bold text-purple-400">TrustPayHub!</span>
        </div>
        <div className="text-slate-400 text-base">
          <span className="font-semibold text-black dark:text-white">{payments.length}</span>{" "}
          Payments ·{" "}
          <span className="font-semibold text-green-400">
            ₹{payments && Array.isArray(payments) ? payments.reduce((a, b) => a + (b.amount || 0), 0) : 0}
          </span>{" "}
          raised
        </div>

      <div className="payment flex gap-6 w-full max-w-5xl mt-16 flex-col md:flex-row">
          <div className="supporters w-full md:w-1/2 bg-black/10 dark:bg-white/10 backdrop-blur-lg rounded-2xl shadow-xl text-black dark:text-white px-4 py-8 md:p-10 border border-black/20 dark:border-white/20">
            <h2 className="text-2xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-blue-500">
              Top Supporters
            </h2>
            <ul className="mx-2 text-lg space-y-4">
              {payments.length === 0 && (
                <li className="text-slate-400">No payments yet</li>
              )}
              {payments.slice(0, 7).map((p, i) => (
                <li
                  key={i}
                  className="flex gap-3 items-center bg-black/10 dark:bg-white/10 rounded-lg p-3 shadow"
                >
                  <Image
                    width={36}
                    height={36}
                    src="/avatar.png"
                    alt="user avatar"
                    className="rounded-full border-2 border-purple-400"
                  />
                  <div>
                    <span className="font-bold text-purple-700 dark:text-purple-300">{p.name}</span>{" "}
                    donated{" "}
                    <span className="font-bold text-green-400">₹{p.amount}</span>
                    <div className="text-sm text-slate-700 dark:text-slate-300">
                      &quot;{p.message}&quot;
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="makePayment w-full md:w-1/2 bg-black/10 dark:bg-white/10 backdrop-blur-lg rounded-2xl shadow-xl text-black dark:text-white px-4 py-8 md:p-10 border border-black/20 dark:border-white/20">
            <h2 className="text-2xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-600">
              Make a Payment
            </h2>
            <div className="flex gap-3 flex-col">
              <input
                onChange={handleChange}
                value={paymentform.name}
                name="name"
                type="text"
                className="w-full p-3 rounded-lg bg-white dark:bg-slate-800 border border-purple-400 focus:border-pink-400 focus:ring-2 focus:ring-purple-400 text-black dark:text-white placeholder:text-slate-400"
                placeholder="Enter Name"
              />
              <input
                onChange={handleChange}
                value={paymentform.message}
                name="message"
                type="text"
                className="w-full p-3 rounded-lg bg-white dark:bg-slate-800 border border-purple-400 focus:border-pink-400 focus:ring-2 focus:ring-purple-400 text-black dark:text-white placeholder:text-slate-400"
                placeholder="Enter Message"
              />
              <input
                onChange={handleChange}
                value={paymentform.amount}
                name="amount"
                type="number"
                min="1"
                className="w-full p-3 rounded-lg bg-white dark:bg-slate-800 border border-purple-400 focus:border-pink-400 focus:ring-2 focus:ring-purple-400 text-black dark:text-white placeholder:text-slate-400"
                placeholder="Enter Amount"
              />
              <button
                onClick={() =>
                  pay(Number.parseInt(paymentform.amount || "0") * 100)
                }
                type="button"
                className="flex items-center justify-center gap-2 text-white dark:text-white bg-gradient-to-br from-purple-600 to-blue-500 dark:from-purple-900 dark:to-blue-900 hover:scale-105 transition-transform duration-200 focus:ring-4 focus:outline-none focus:ring-blue-300 font-semibold rounded-xl text-base px-6 py-3 shadow-lg disabled:bg-slate-600 disabled:from-purple-100"
                disabled={
                  paymentform.name?.length < 3 ||
                  paymentform.message?.length < 4 ||
                  paymentform.amount?.length < 1 ||
                  paymentLoading
                }
              >
                {paymentLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 8v4l3 3"
                      ></path>
                      <circle cx="12" cy="12" r="10"></circle>
                    </svg>
                    Pay
                  </>
                )}
              </button>
            </div>
            <div className="flex flex-col md:flex-row gap-3 mt-6">
              <button
                className="bg-gradient-to-r from-purple-700 to-blue-700 text-white font-semibold p-3 rounded-lg shadow hover:scale-105 transition-transform"
                onClick={() => pay(1000)}
              >
                Pay ₹10
              </button>
              <button
                className="bg-gradient-to-r from-purple-700 to-blue-700 text-white font-semibold p-3 rounded-lg shadow hover:scale-105 transition-transform"
                onClick={() => pay(2000)}
              >
                Pay ₹20
              </button>
              <button
                className="bg-gradient-to-r from-purple-700 to-blue-700 text-white font-semibold p-3 rounded-lg shadow hover:scale-105 transition-transform"
                onClick={() => pay(3000)}
              >
                Pay ₹30
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default PaymentPage;
