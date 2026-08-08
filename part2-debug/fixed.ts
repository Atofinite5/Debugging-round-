import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

const db = admin.firestore();

interface BookingRequest {
  studentId: string;
  teacherId: string;
  slot: string;
  subject: string;
}

interface BookingResult {
  success: boolean;
  message?: string;
}

export const bookSession = functions.https.onCall(
  async (data: BookingRequest, context: functions.https.CallableContext): Promise<BookingResult> => {
    if (!context.auth) {
      return { success: false, message: "You must be signed in to book a session." };
    }
    if (context.auth.uid !== data.studentId) {
      return { success: false, message: "You can only book sessions for your own student account." };
    }

    if (
      !data ||
      typeof data.studentId !== "string" ||
      typeof data.teacherId !== "string" ||
      typeof data.slot !== "string" ||
      typeof data.subject !== "string" ||
      Number.isNaN(Date.parse(data.slot))
    ) {
      return { success: false, message: "Invalid booking payload." };
    }

    const existing = await db
      .collection("bookings")
      .where("teacherId", "==", data.teacherId)
      .where("slot", "==", data.slot)
      .get();

    if (!existing.empty) {
      return { success: false, message: "Slot already booked" };
    }

    const booking = {
      studentId: data.studentId,
      teacherId: data.teacherId,
      slot: data.slot,
      subject: data.subject,
      status: "confirmed",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    try {
      await db.collection("bookings").doc(`${data.teacherId}_${data.slot}`).create(booking);
    } catch (error) {
      if ((error as { code?: string }).code === "already-exists") {
        return { success: false, message: "Slot already booked" };
      }
      throw error;
    }

    return { success: true };
  }
);
