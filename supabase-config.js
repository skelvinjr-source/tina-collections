// Supabase Configuration for Tina Collections
const SUPABASE_URL = 'https://gkhlfvdzndyybkxldyxm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdraGxmdmR6bmR5eWJreGxkeXhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxMjEzMzQsImV4cCI6MjA3NzY5NzMzNH0.hEzxcBOGtRillIES9FQx3AoCIw9KLBANtGLnoW4xgio';

// Initialize Supabase client (using the global supabase object from CDN)
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Supabase Helper Functions
const SupabaseAPI = {
    // Save order to database
    async saveOrder(orderData) {
        try {
            // Insert order
            const { data: order, error: orderError } = await supabaseClient
                .from('orders')
                .insert([{
                    customer_name: orderData.customerName,
                    customer_phone: orderData.customerPhone,
                    customer_address: orderData.customerAddress,
                    payment_method: orderData.paymentMethod,
                    total_amount: orderData.totalAmount,
                    status: 'pending'
                }])
                .select()
                .single();

            if (orderError) throw orderError;

            // Insert order items
            const orderItems = orderData.items.map(item => ({
                order_id: order.id,
                product_name: item.name,
                product_price: item.price,
                size: item.size,
                quantity: item.quantity,
                subtotal: item.price * item.quantity
            }));

            const { error: itemsError } = await supabaseClient
                .from('order_items')
                .insert(orderItems);

            if (itemsError) throw itemsError;

            return { success: true, orderId: order.id };
        } catch (error) {
            console.error('Error saving order:', error);
            return { success: false, error: error.message };
        }
    },

    // Save contact message to database
    async saveMessage(messageData) {
        try {
            const { data, error } = await supabaseClient
                .from('messages')
                .insert([{
                    name: messageData.name,
                    email: messageData.email,
                    phone: messageData.phone,
                    message: messageData.message,
                    status: 'unread'
                }])
                .select()
                .single();

            if (error) throw error;

            return { success: true, messageId: data.id };
        } catch (error) {
            console.error('Error saving message:', error);
            return { success: false, error: error.message };
        }
    },

    // Get all products (for future use)
    async getProducts() {
        try {
            const { data, error } = await supabaseClient
                .from('products')
                .select('*')
                .eq('in_stock', true)
                .order('created_at', { ascending: false });

            if (error) throw error;

            return { success: true, products: data };
        } catch (error) {
            console.error('Error fetching products:', error);
            return { success: false, error: error.message };
        }
    },

    // Save chat message to database
    async saveChatMessage(messageData) {
        try {
            const { data, error } = await supabaseClient
                .from('chat_messages')
                .insert([{
                    session_id: messageData.sessionId,
                    sender: messageData.sender,
                    message: messageData.message
                }])
                .select()
                .single();

            if (error) throw error;

            return { success: true, messageId: data.id };
        } catch (error) {
            console.error('Error saving chat message:', error);
            return { success: false, error: error.message };
        }
    },

    // Get all messages (for admin panel)
    async getMessages() {
        try {
            const { data, error } = await supabaseClient
                .from('messages')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            return { success: true, messages: data };
        } catch (error) {
            console.error('Error fetching messages:', error);
            return { success: false, error: error.message };
        }
    },

    // Update message status (for admin panel)
    async updateMessageStatus(messageId, status) {
        try {
            const { error } = await supabaseClient
                .from('messages')
                .update({ status: status })
                .eq('id', messageId);

            if (error) throw error;

            return { success: true };
        } catch (error) {
            console.error('Error updating message status:', error);
            return { success: false, error: error.message };
        }
    },

    // Delete message (for admin panel)
    async deleteMessage(messageId) {
        try {
            const { error } = await supabaseClient
                .from('messages')
                .delete()
                .eq('id', messageId);

            if (error) throw error;

            return { success: true };
        } catch (error) {
            console.error('Error deleting message:', error);
            return { success: false, error: error.message };
        }
    },

    // Save reply to message (for admin panel)
    async saveReply(messageId, replyText) {
        try {
            const { error } = await supabaseClient
                .from('messages')
                .update({
                    reply: replyText,
                    status: 'replied'
                })
                .eq('id', messageId);

            if (error) throw error;

            return { success: true };
        } catch (error) {
            console.error('Error saving reply:', error);
            return { success: false, error: error.message };
        }
    }
};
