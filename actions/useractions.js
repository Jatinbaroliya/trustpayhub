"use server"
import Razorpay from "razorpay"
import Payment from "@/models/Payment"
import User from "@/models/User"
import connectDb from "@/db/connectDb"

// Initiates a Razorpay order and saves the pending payment in the database
export const initiate = async (amount, to_username, paymentform) => {
    try {
        await connectDb()

        const user = await User.findOne({ username: to_username })
        if (!user) {
            throw new Error("User not found")
        }

        // Get Razorpay keys from environment variables first, fallback to database
        let keyId = process.env.RAZORPAY_KEY_ID?.trim() || user.razorpayid?.trim()
        let secret = process.env.RAZORPAY_KEY_SECRET?.trim() || user.razorpaysecret?.trim()

        if (!keyId || !secret) {
            throw new Error("Payment gateway not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in environment variables or dashboard settings.")
        }

        // Validate key format
        if (keyId.length < 10) {
            throw new Error("Invalid Razorpay Key ID. Please check your environment variables or dashboard settings.")
        }
        if (secret.length < 10) {
            throw new Error("Invalid Razorpay Key Secret. Please check your environment variables or dashboard settings.")
        }

        // Log key format for debugging (without exposing full keys)
        console.log("Using Razorpay Key ID:", keyId.substring(0, 15) + "...")
        console.log("Using Razorpay Secret:", secret.substring(0, 8) + "...")
        console.log("Key source:", process.env.RAZORPAY_KEY_ID ? "Environment variables" : "Database")

        const instance = new Razorpay({
            key_id: keyId,
            key_secret: secret
        })

        // Validate amount
        const orderAmount = Number.parseInt(amount)
        if (!orderAmount || orderAmount < 100) {
            throw new Error("Invalid amount. Minimum amount is ₹1 (100 paise)")
        }

        const options = {
            amount: orderAmount,
            currency: "INR",
            receipt: `receipt_${to_username}_${Date.now()}`
        }

        const order = await instance.orders.create(options)
        
        console.log("Razorpay order created successfully:", order.id)

        await Payment.create({
            oid: order.id,
            amount: amount / 100,
            to_user: to_username,
            name: paymentform.name,
            message: paymentform.message
        })

        // Return order with key_id so client can use the same key
        return {
            ...order,
            key_id: keyId
        }
    } catch (error) {
        console.error("Error initiating payment:", error)
        
        // Handle Razorpay authentication errors
        if (error.statusCode === 401 || (error.error && error.error.code === 'BAD_REQUEST_ERROR')) {
            throw new Error("Razorpay authentication failed. Please check your API keys in the dashboard settings.")
        }
        
        // Handle database quota errors
        if (error.message && error.message.includes("quota")) {
            throw new Error("Database storage limit exceeded. Please contact support.")
        }
        
        // Handle other Razorpay errors
        if (error.statusCode) {
            throw new Error(error.error?.description || `Payment gateway error (${error.statusCode}). Please try again.`)
        }
        
        throw error
    }
}

// Fetches a user by username and flattens ObjectIds
export const fetchuser = async (username) => {
    try {
        await connectDb()
        const user = await User.findOne({ username })
        if (!user) return null

        const userObj = user.toObject({ flattenObjectIds: true })
        // Ensure _id is string
        userObj._id = userObj._id.toString()
        return userObj
    } catch (error) {
        console.error("Error fetching user:", error)
        if (error.message && error.message.includes("quota")) {
            throw new Error("Database storage limit exceeded. Please contact support.")
        }
        throw new Error("Failed to fetch user data")
    }
}

// Fetches recent completed payments sorted by amount descending
export const fetchpayments = async (username) => {
    try {
        await connectDb()
        const payments = await Payment.find({ to_user: username, done: true })
            .sort({ amount: -1 })
            .lean()

        // Convert ObjectIds and BSON types to strings
        const cleanPayments = payments.map(p => ({
            ...p,
            _id: p._id.toString(),
            createdAt: p.createdAt ? p.createdAt.toISOString() : null,
            updatedAt: p.updatedAt ? p.updatedAt.toISOString() : null,
        }))

        return cleanPayments
    } catch (error) {
        console.error("Error fetching payments:", error)
        return []
    }
}

// Updates a user profile; handles username conflict and propagates changes to Payment
export const updateProfile = async (data, oldusername) => {
    await connectDb()

    // Convert data safely depending on whether it's FormData or a plain object
    const ndata = typeof data?.entries === "function"
        ? Object.fromEntries(data.entries())
        : { ...data }

    if (!ndata?.email || !ndata?.username) {
        return { error: "Invalid profile data" }
    }

    // If username is changed, check for conflicts
    if (oldusername !== ndata.username) {
        const existingUser = await User.findOne({ username: ndata.username })
        if (existingUser) {
            return { error: "Username already exists" }
        }

        await User.updateOne({ email: ndata.email }, ndata)
        await Payment.updateMany({ to_user: oldusername }, { to_user: ndata.username })
    } else {
        await User.updateOne({ email: ndata.email }, ndata)
    }

    return { success: true }
}
